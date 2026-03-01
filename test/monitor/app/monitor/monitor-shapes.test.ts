import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { MonitorProcess } from '#src/monitor/app/monitor/monitor-shapes';

test('MonitorProcess constructs from valid fields', () => {
	const monitorProcess = new MonitorProcess({
		pid: 12345,
		base_url: 'http://127.0.0.1:18001',
		start_date: '2026-03-01T00:00:00.000Z',
		version: '1.0.0',
	});

	assert(monitorProcess.pid === 12345, 'pid must be preserved');
});

test('MonitorProcess rejects invalid fields', () => {
	assert.throws(
		() =>
			new MonitorProcess({
				pid: 0,
				base_url: 'http://127.0.0.1:18001',
				start_date: '2026-03-01T00:00:00.000Z',
				version: '1.0.0',
			}),
		'MonitorProcess must reject invalid data',
	);
});
