import childProcess from 'node:child_process';
import type { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { MonitorProcess } from '#src/monitor/app/monitor/monitor-shapes';
import type { RegistryService } from '#src/shared/registry/registry-service';
import { reserveBaseUrl } from '#src/shared/utils/base-url';

export class MonitorService {
	private readonly repo: MonitorRepo;
	private readonly registry: RegistryService;

	constructor(repo: MonitorRepo, registry: RegistryService) {
		this.repo = repo;
		this.registry = registry;
	}

	async getStatus() {
		const monitorProcess = await this.repo.readProcess();

		if (!monitorProcess) {
			return null;
		}

		if (!isPidAlive(monitorProcess.pid)) {
			await this.repo.clearProcess();
			return null;
		}

		return monitorProcess;
	}

	async ensureRunning() {
		const existing = await this.getStatus();

		if (existing) {
			openBrowser(existing.base_url);
			return existing;
		}

		spawnDetachedServe();
		const monitorProcess = await this.waitForProcess();

		if (monitorProcess) {
			openBrowser(monitorProcess.base_url);
		}

		return monitorProcess;
	}

	async serve(version: string) {
		const baseUrl = await reserveBaseUrl();
		const url = new URL(baseUrl);
		const startDate = new Date().toISOString();
		let cleanupTimer: ReturnType<typeof setInterval> | null = null;
		const monitorProcess = new MonitorProcess({
			pid: process.pid,
			base_url: baseUrl,
			start_date: startDate,
			version,
		});

		await this.repo.writeProcess(monitorProcess);

		const server = Bun.serve({
			hostname: url.hostname,
			port: Number(url.port),
			fetch(request) {
				if (new URL(request.url).pathname === '/health') {
					return Response.json({
						name: 'glitch-monitor',
						status: 'running',
					});
				}

				return new Response(
					JSON.stringify({
						name: 'glitch-monitor',
						status: 'running',
						url: request.url,
					}),
					{
						headers: {
							'content-type': 'application/json',
						},
					},
				);
			},
		});
		cleanupTimer = setInterval(() => {
			const crashDate = new Date().toISOString();
			const cutoffDate = new Date(Date.now() - 180_000).toISOString();
			this.registry.markCrashedAgents(cutoffDate, crashDate);
		}, 180_000);

		const shutdown = async () => {
			if (cleanupTimer) {
				clearInterval(cleanupTimer);
				cleanupTimer = null;
			}

			server.stop(true);
			await this.repo.clearProcess();
			process.exit(0);
		};

		process.on('SIGINT', () => shutdown());
		process.on('SIGTERM', () => shutdown());

		await new Promise(() => {});
	}

	async stop() {
		const monitorProcess = await this.repo.readProcess();

		if (!monitorProcess) {
			return false;
		}

		if (!isPidAlive(monitorProcess.pid)) {
			await this.repo.clearProcess();
			return false;
		}

		process.kill(monitorProcess.pid, 'SIGTERM');
		return true;
	}

	private async waitForProcess() {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			await Bun.sleep(100);
			const monitorProcess = await this.getStatus();

			if (monitorProcess) {
				return monitorProcess;
			}
		}

		return null;
	}
}

function isPidAlive(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

function spawnDetachedServe() {
	const args = getServeCommandArgs();
	const child = childProcess.spawn(args.command, args.args, {
		detached: true,
		stdio: 'ignore',
	});

	child.unref();
}

function getServeCommandArgs() {
	const executable = process.execPath;
	const scriptPath = Bun.argv[1];

	if (scriptPath && scriptPath !== executable) {
		return {
			command: executable,
			args: [scriptPath, 'serve'],
		};
	}

	return {
		command: executable,
		args: ['serve'],
	};
}

function openBrowser(url: string) {
	try {
		if (process.platform === 'win32') {
			childProcess
				.spawn('cmd', ['/c', 'start', '', url], {
					detached: true,
					stdio: 'ignore',
				})
				.unref();
			return;
		}

		if (process.platform === 'darwin') {
			childProcess
				.spawn('open', [url], {
					detached: true,
					stdio: 'ignore',
				})
				.unref();
			return;
		}

		childProcess
			.spawn('xdg-open', [url], {
				detached: true,
				stdio: 'ignore',
			})
			.unref();
	} catch {}
}
