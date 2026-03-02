import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { MonitorLock, MonitorStatus } from '#src/monitor/app/monitor/monitor-shapes';

test('MonitorLock constructs from valid fields', () => {
	const monitorLock = new MonitorLock({
		pid: 12345,
		base_url: 'http://127.0.0.1:18001',
		start_date: '2026-03-01T00:00:00.000Z',
		version: '1.0.0',
	});

	assert(monitorLock.pid === 12345, 'pid must be preserved');
});

test('MonitorLock rejects invalid fields', () => {
	assert.throws(
		() =>
			new MonitorLock({
				pid: 0,
				base_url: 'http://127.0.0.1:18001',
				start_date: '2026-03-01T00:00:00.000Z',
				version: '1.0.0',
			}),
		'MonitorLock must reject invalid data',
	);
});

test('MonitorStatus constructs from valid fields', () => {
	const monitorStatus = new MonitorStatus({
		pid: 12345,
		base_url: 'http://127.0.0.1:18001',
		start_date: '2026-03-01T00:00:00.000Z',
		version: '1.0.0',
		healthy: true,
	});

	assert(monitorStatus.healthy === true, 'healthy must be preserved');
});

test('MonitorStatus rejects invalid fields', () => {
	assert.throws(
		() =>
			new MonitorStatus({
				pid: 12345,
				base_url: 'http://127.0.0.1:18001',
				start_date: '2026-03-01T00:00:00.000Z',
				version: '1.0.0',
				healthy: 'yes',
			}),
		'MonitorStatus must reject invalid data',
	);
});
