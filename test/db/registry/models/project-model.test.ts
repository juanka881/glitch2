import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ProjectModel } from '#src/db/registry/models/project-model';

test('ProjectModel constructs from valid fields', () => {
	const model = new ProjectModel({
		id: '11111111-1111-7111-8111-111111111111',
		name: 'demo',
		cwd: 'C:/demo',
		cwd_hash: 'A'.repeat(64),
		add_date: '2026-03-01T00:00:00.000Z',
		last_ping_date: '2026-03-01T00:00:00.000Z',
		latest_agent_id: null,
	});

	assert(model.name === 'demo', 'name must be preserved');
});

test('ProjectModel rejects invalid fields', () => {
	assert.throws(
		() =>
			new ProjectModel({
				id: 'bad',
				name: 'demo',
				cwd: 'C:/demo',
				cwd_hash: 'bad',
				add_date: '2026-03-01T00:00:00.000Z',
				last_ping_date: '2026-03-01T00:00:00.000Z',
				latest_agent_id: null,
			}),
		'ProjectModel must reject invalid data',
	);
});

