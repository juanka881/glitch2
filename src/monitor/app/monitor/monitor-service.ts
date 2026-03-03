import { getLogger, type Logger } from '@logtape/logtape';
import { Server as BunEngineServer } from '@socket.io/bun-engine';
import type { Hono } from 'hono';
import { Server as SocketServer } from 'socket.io';
import type { MonitorQueryService } from '#src/monitor/app/monitor/monitor-query-service';
import type { MonitorProcessManager } from '#src/monitor/app/monitor/monitor-process-manager';
import type { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { createMonitorRouter } from '#src/monitor/app/monitor/api/monitor-router';
import { MonitorLock, MonitorStatus } from '#src/monitor/app/monitor/monitor-shapes';
import { MonitorStreamService } from '#src/monitor/app/monitor/monitor-stream-service';
import { EventBus } from '#src/shared/events/event-bus';
import type { RegistryService } from '#src/shared/registry/registry-service';
import { createApiApp } from '#src/shared/utils/http';
import { isAbortError } from '#src/shared/utils/error';
import { wait } from '#src/shared/utils/promise';
import { reserveBaseUrl } from '#src/shared/utils/base-url';
import { ShutdownManager } from '#src/shared/utils/shutdown-manager';

const HEALTH_TIMEOUT_MS = 5_000;
const MONITOR_STOP_TIMEOUT_MS = 5_000;
const MONITOR_STOP_POLL_MS = 250;
const MONITOR_CLEANUP_INTERVAL_MS = 180_000;
const MONITOR_START_POLL_ATTEMPTS = 18;
const MONITOR_START_POLL_MS = 100;
const MONITOR_EVENT_PATH = '/api/event';
const MONITOR_STREAM_BUFFER_SIZE = 100;

export class MonitorService {
	private readonly repo: MonitorRepo;
	private readonly registry: RegistryService;
	private readonly processManager: MonitorProcessManager;
	private readonly log: Logger;

	constructor(repo: MonitorRepo, registry: RegistryService, processManager: MonitorProcessManager) {
		this.repo = repo;
		this.registry = registry;
		this.processManager = processManager;
		this.log = getLogger(['glitch', 'monitor']);
	}

	async readLock(): Promise<MonitorLock | undefined> {
		return await this.repo.readLock();
	}

	async removeLock(): Promise<void> {
		await this.repo.removeLock();
	}

	async acquireLock(version: string): Promise<MonitorLock | undefined> {
		const writeLock = await this.repo.acquireLock();

		if (writeLock) {
			const monitorLock = new MonitorLock({
				pid: process.pid,
				base_url: await reserveBaseUrl(),
				start_date: new Date().toISOString(),
				version,
			});

			await writeLock(monitorLock);
			return monitorLock;
		}

		const existingLock = await this.repo.readLock();

		if (!existingLock) {
			return undefined;
		}

		if (this.processManager.isAlive(existingLock.pid)) {
			return undefined;
		}

		await this.repo.removeLock();
		return await this.acquireLock(version);
	}

	async isHealthy(monitorLock: MonitorLock): Promise<boolean> {
		if (!this.processManager.isAlive(monitorLock.pid)) {
			return false;
		}

		try {
			const response = await fetch(`${monitorLock.base_url}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
			});

			return response.ok;
		} catch (error) {
			if (isAbortError(error)) {
				return false;
			}

			throw error;
		}
	}

	async getStatus(): Promise<MonitorStatus | undefined> {
		const monitorLock = await this.repo.readLock();

		if (!monitorLock) {
			return undefined;
		}

		if (!this.processManager.isAlive(monitorLock.pid)) {
			await this.repo.removeLock();
			return undefined;
		}

		const healthy = await this.isHealthy(monitorLock);
		const monitorStatus = new MonitorStatus({
			pid: monitorLock.pid,
			base_url: monitorLock.base_url,
			start_date: monitorLock.start_date,
			version: monitorLock.version,
			healthy,
		});

		return monitorStatus;
	}

	async start(): Promise<MonitorLock | undefined> {
		const monitorLock = await this.repo.readLock();

		if (monitorLock && this.processManager.isAlive(monitorLock.pid)) {
			return monitorLock;
		}

		if (monitorLock) {
			await this.repo.removeLock();
		}

		this.processManager.startBackgroundServe();
		return await this.waitForLock();
	}

	async stop(): Promise<boolean> {
		const monitorLock = await this.repo.readLock();

		if (!monitorLock) {
			return false;
		}

		if (!this.processManager.isAlive(monitorLock.pid)) {
			await this.repo.removeLock();
			return false;
		}

		this.processManager.stop(monitorLock.pid);
		const stopStartDate = Date.now();

		while (this.processManager.isAlive(monitorLock.pid)) {
			const elapsedMs = Date.now() - stopStartDate;

			if (elapsedMs >= MONITOR_STOP_TIMEOUT_MS) {
				break;
			}

			await wait(MONITOR_STOP_POLL_MS);
		}

		if (this.processManager.isAlive(monitorLock.pid)) {
			this.processManager.forceStop(monitorLock.pid);
		}

		await this.repo.removeLock();
		return true;
	}

	async serve(version: string, query: MonitorQueryService): Promise<void> {
		const monitorLock = await this.acquireLock(version);

		if (!monitorLock) {
			this.log.info('monitor already running');
			return;
		}

		const monitorUrl = new URL(monitorLock.base_url);
		const io = new SocketServer({
			path: MONITOR_EVENT_PATH,
			serveClient: false,
		});
		const engine = new BunEngineServer({
			path: MONITOR_EVENT_PATH,
		});
		const eventBus = new EventBus(io);
		const streamService = new MonitorStreamService(eventBus, MONITOR_STREAM_BUFFER_SIZE);
		const app = this.createApp(query, streamService);
		const server = this.createServer(monitorUrl, app, engine);

		io.bind(engine);
		eventBus.bind();

		const cleanupTimer = setInterval(() => {
			const crashDate = new Date().toISOString();
			const cutoffDate = new Date(Date.now() - MONITOR_CLEANUP_INTERVAL_MS).toISOString();

			try {
				this.registry.markCrashedAgents(cutoffDate, crashDate);
			} catch (error) {
				this.log.error('failed to mark crashed agents', { error });
			}
		}, MONITOR_CLEANUP_INTERVAL_MS);

		const shutdownManager = new ShutdownManager();
		shutdownManager.setExitCallback((context) => process.exit(context.code));

		shutdownManager.register('stop cleanup timer', () => {
			clearInterval(cleanupTimer);
		});

		shutdownManager.register('stop monitor server', () => {
			server.stop(true);
		});

		shutdownManager.register('close socket server', async () => {
			await io.close();
		});

		shutdownManager.register('remove monitor lock', async () => {
			await this.repo.removeLock();
		});

		process.once('SIGINT', () => shutdownManager.shutdown(130, 'SIGINT'));
		process.once('SIGTERM', () => shutdownManager.shutdown(143, 'SIGTERM'));

		if (process.platform === 'win32') {
			process.once('SIGBREAK', () => shutdownManager.shutdown(131, 'SIGBREAK'));
		}
	}

	openBrowser(url: string): void {
		this.processManager.openBrowser(url);
	}

	private createApp(query: MonitorQueryService, stream: MonitorStreamService): Hono {
		const app = createApiApp('glitch-monitor');
		const monitorRouter = createMonitorRouter({
			query,
			stream,
		});

		app.route('/', monitorRouter);
		return app;
	}

	private createServer(monitorUrl: URL, app: Hono, engine: BunEngineServer) {
		const engineHandler = engine.handler();

		return Bun.serve({
			hostname: monitorUrl.hostname,
			port: Number(monitorUrl.port),
			websocket: engineHandler.websocket,
			async fetch(request, server) {
				const requestUrl = new URL(request.url);
				const requestPath = requestUrl.pathname;

				if (requestPath.startsWith(MONITOR_EVENT_PATH)) {
					return engine.handleRequest(request, server);
				}

				return app.fetch(request);
			},
		});
	}

	private async waitForLock(): Promise<MonitorLock | undefined> {
		for (let attempt = 0; attempt < MONITOR_START_POLL_ATTEMPTS; attempt += 1) {
			const monitorLock = await this.repo.readLock();

			if (monitorLock) {
				return monitorLock;
			}

			await wait(MONITOR_START_POLL_MS);
		}

		return undefined;
	}
}
