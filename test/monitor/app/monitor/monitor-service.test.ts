import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';
import type { MonitorProcessManager } from '#src/monitor/app/monitor/monitor-process-manager';
import { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { MonitorService } from '#src/monitor/app/monitor/monitor-service';
import { MonitorLock } from '#src/monitor/app/monitor/monitor-shapes';
import type { RegistryService } from '#src/shared/registry/registry-service';

class FakeMonitorProcessManager implements MonitorProcessManager {
	alivePids: Set<number>;
	started: number;
	stopped: number[];
	forced: number[];
	openedUrls: string[];

	constructor() {
		this.alivePids = new Set();
		this.started = 0;
		this.stopped = [];
		this.forced = [];
		this.openedUrls = [];
	}

	isAlive(pid: number): boolean {
		return this.alivePids.has(pid);
	}

	openBrowser(url: string): void {
		this.openedUrls.push(url);
	}

	startBackgroundServe(): void {
		this.started += 1;
	}

	stop(pid: number): void {
		this.stopped.push(pid);
		this.alivePids.delete(pid);
	}

	forceStop(pid: number): void {
		this.forced.push(pid);
		this.alivePids.delete(pid);
	}
}

function createRegistry(): RegistryService {
	return {
		markCrashedAgents() {},
	} as unknown as RegistryService;
}

async function storeMonitorLock(repo: MonitorRepo, monitorLock: MonitorLock): Promise<void> {
	const writeLock = await repo.acquireLock();

	assert(writeLock !== undefined, 'monitor lock writer must exist');

	await writeLock(monitorLock);
}

async function createService(): Promise<{
	tempDir: string;
	repo: MonitorRepo;
	service: MonitorService;
	processManager: FakeMonitorProcessManager;
}> {
	const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'glitch-monitor-service-'));
	const lockPath = path.join(tempDir, 'monitor.lock.json');
	const repo = new MonitorRepo(lockPath);
	const processManager = new FakeMonitorProcessManager();
	const registry = createRegistry();
	const service = new MonitorService(repo, registry, processManager);

	return {
		tempDir,
		repo,
		service,
		processManager,
	};
}

test('MonitorService getStatus removes stale locks', async () => {
	const { tempDir, repo, service } = await createService();

	try {
		const monitorLock = new MonitorLock({
			pid: 12345,
			base_url: 'http://127.0.0.1:18001',
			start_date: '2026-03-01T00:00:00.000Z',
			version: '1.0.0',
		});

		await storeMonitorLock(repo, monitorLock);

		const status = await service.getStatus();
		const stored = await repo.readLock();

		assert(status === undefined, 'status must be undefined for a stale lock');
		assert(stored === undefined, 'stale lock must be removed');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});

test('MonitorService start returns an existing live lock', async () => {
	const { tempDir, repo, service, processManager } = await createService();

	try {
		const monitorLock = new MonitorLock({
			pid: 12345,
			base_url: 'http://127.0.0.1:18001',
			start_date: '2026-03-01T00:00:00.000Z',
			version: '1.0.0',
		});

		processManager.alivePids.add(12345);
		await storeMonitorLock(repo, monitorLock);

		const started = await service.start();

		assert(started?.pid === 12345, 'start must reuse the existing monitor');
		assert(processManager.started === 0, 'existing monitor must not spawn a new background serve');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});

test('MonitorService stop removes the lock for a live monitor', async () => {
	const { tempDir, repo, service, processManager } = await createService();

	try {
		const monitorLock = new MonitorLock({
			pid: 12345,
			base_url: 'http://127.0.0.1:18001',
			start_date: new Date().toISOString(),
			version: '1.0.0',
		});

		processManager.alivePids.add(12345);
		await storeMonitorLock(repo, monitorLock);

		const stopped = await service.stop();
		const stored = await repo.readLock();

		assert(stopped === true, 'stop must return true for a live monitor');
		assert(processManager.stopped[0] === 12345, 'stop must signal the monitor pid');
		assert(stored === undefined, 'stop must remove the monitor lock');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});
