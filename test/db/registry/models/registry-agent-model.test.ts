import assert from 'node:assert/strict';
import { test } from 'vitest';
import { RegistryAgentModel } from '#src/db/registry/models/registry-agent-model';

test('RegistryAgentModel constructs from valid fields', () => {
	const model = new RegistryAgentModel({
		id: '11111111-1111-7111-8111-111111111111',
		project_id: '22222222-2222-7222-8222-222222222222',
		cwd: 'C:/demo',
		pid: 12345,
		start_date: '2026-03-01T00:00:00.000Z',
		end_date: null,
		ping_date: '2026-03-01T00:00:00.000Z',
		base_url: 'http://127.0.0.1:18001',
		status: 'running',
		error: null,
	});

	assert(model.status === 'running', 'status must be preserved');
});

test('RegistryAgentModel rejects invalid fields', () => {
	assert.throws(
		() =>
			new RegistryAgentModel({
				id: 'bad',
				project_id: '22222222-2222-7222-8222-222222222222',
				cwd: 'C:/demo',
				pid: 12345,
				start_date: '2026-03-01T00:00:00.000Z',
				end_date: null,
				ping_date: '2026-03-01T00:00:00.000Z',
				base_url: 'http://127.0.0.1:18001',
				status: 'running',
				error: null,
			}),
		'RegistryAgentModel must reject invalid data',
	);
});
