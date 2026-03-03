import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ProcessRunModel } from '#src/db/agent/models/process-run-model';

test('ProcessRunModel constructs from valid fields', () => {
	const model = new ProcessRunModel({
		id: '11111111-1111-4111-8111-111111111111',
		agent_run_id: '22222222-2222-4222-8222-222222222222',
		process_id: 'web',
		command: 'bun run dev',
		cwd: '.',
		pid: 12345,
		start_date: '2026-02-28T22:00:00.000Z',
		end_date: null,
		exit_code: null,
		signal: null,
		status: 'running',
	});

	assert(model.process_id === 'web', 'process_id must be preserved');
});

test('ProcessRunModel rejects invalid fields', () => {
	assert.throws(
		() =>
			new ProcessRunModel({
				id: '11111111-1111-4111-8111-111111111111',
				agent_run_id: '22222222-2222-4222-8222-222222222222',
				process_id: '',
				command: 'bun run dev',
				cwd: '.',
				pid: 12345,
				start_date: '2026-02-28T22:00:00.000Z',
				end_date: null,
				exit_code: null,
				signal: null,
				status: 'running',
			}),
		'ProcessRunModel must reject invalid data',
	);
});
