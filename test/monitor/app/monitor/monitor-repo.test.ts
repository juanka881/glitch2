import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { MonitorLock } from '#src/monitor/app/monitor/monitor-shapes';

async function createStoredLock(repo: MonitorRepo): Promise<MonitorLock> {
	const writeLock = await repo.acquireLock();

	assert(writeLock !== undefined, 'lock writer must be returned for a new lock');

	const monitorLock = new MonitorLock({
		pid: 12345,
		base_url: 'http://127.0.0.1:18001',
		start_date: '2026-03-01T00:00:00.000Z',
		version: '1.0.0',
	});

	await writeLock(monitorLock);

	return monitorLock;
}

test('MonitorRepo acquires and reads monitor lock state', async () => {
	const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'glitch-monitor-repo-'));
	const repo = new MonitorRepo(tempDir);

	try {
		const monitorLock = await createStoredLock(repo);
		const stored = await repo.readLock();

		assert(stored !== undefined, 'stored monitor lock must exist');
		assert(stored?.pid === monitorLock.pid, 'stored monitor pid must match');
		assert(stored?.base_url === monitorLock.base_url, 'stored monitor base_url must match');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});

test('MonitorRepo acquires lock exclusively', async () => {
	const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'glitch-monitor-repo-'));
	const repo = new MonitorRepo(tempDir);

	try {
		const firstWriter = await repo.acquireLock();
		const secondWriter = await repo.acquireLock();

		assert(firstWriter !== undefined, 'first writer must be returned');
		assert(secondWriter === undefined, 'second writer must be undefined when the lock already exists');

		if (firstWriter) {
			const monitorLock = new MonitorLock({
				pid: 12345,
				base_url: 'http://127.0.0.1:18001',
				start_date: '2026-03-01T00:00:00.000Z',
				version: '1.0.0',
			});

			await firstWriter(monitorLock);
		}
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});

test('MonitorRepo removes monitor lock state', async () => {
	const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'glitch-monitor-repo-'));
	const repo = new MonitorRepo(tempDir);

	try {
		await createStoredLock(repo);
		await repo.removeLock();

		const stored = await repo.readLock();

		assert(stored === undefined, 'monitor lock must be removed');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});

test('MonitorRepo returns undefined for an incomplete lock file', async () => {
	const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'glitch-monitor-repo-'));
	const lockPath = path.join(tempDir, 'monitor.lock');
	const statePath = path.join(tempDir, 'monitor.state.json');
	const repo = new MonitorRepo(tempDir);

	try {
		await fsp.writeFile(lockPath, '', 'utf-8');
		await fsp.writeFile(statePath, '{"pid": 12345', 'utf-8');

		const stored = await repo.readLock();

		assert(stored === undefined, 'incomplete lock file must be treated as not ready');
	} finally {
		await fsp.rm(tempDir, { recursive: true, force: true });
	}
});
