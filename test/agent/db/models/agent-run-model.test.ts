import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { AgentRunModel } from '#src/agent/db/models/agent-run-model';

test('AgentRunModel constructs from valid fields', () => {
	const model = new AgentRunModel({
		id: '11111111-1111-4111-8111-111111111111',
		project_id: '22222222-2222-4222-8222-222222222222',
		project_name: 'demo',
		cwd: 'C:/demo',
		start_date: '2026-02-28T22:00:00.000Z',
		end_date: null,
		agent_version: '1.0.0',
		status: 'running',
		error: null,
	});

	assert(model.status === 'running', 'status must be running');
});

test('AgentRunModel rejects invalid fields', () => {
	assert.throws(
		() =>
			new AgentRunModel({
				id: 'not-a-uuid',
				project_id: '22222222-2222-4222-8222-222222222222',
				project_name: 'demo',
				cwd: 'C:/demo',
				start_date: '2026-02-28T22:00:00.000Z',
				end_date: null,
				agent_version: '1.0.0',
				status: 'running',
				error: null,
			}),
		'AgentRunModel must reject invalid data',
	);
});
