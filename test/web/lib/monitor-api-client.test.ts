import assert from 'node:assert/strict';
import { test } from 'vitest';
import { MonitorApiClient } from '#src/web/lib/monitor-api-client';

test('MonitorApiClient parses monitor payloads', async () => {
	const apiClient = new MonitorApiClient('http://example.test');
	const originalFetch = globalThis.fetch;

	globalThis.fetch = (async () => {
		return new Response(
			JSON.stringify({
				pid: 100,
				start_date: '2026-03-03T00:00:00.000Z',
				base_url: 'http://127.0.0.1:19001',
				version: '0.1.0',
				healthy: true,
			}),
		);
	}) as unknown as typeof fetch;

	try {
		const monitor = await apiClient.getMonitor();

		assert(monitor.pid === 100, 'monitor client must parse monitor payload');
	} finally {
		globalThis.fetch = originalFetch;
	}
});
