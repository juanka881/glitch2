import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ProcessDefinition } from '#src/agent/app/supervisor/supervisor-shapes';

test('ProcessDefinition constructs from valid fields', () => {
	const definition = new ProcessDefinition({
		id: 'web',
		command: 'bun run dev',
		cwd: '.',
		env: {
			NODE_ENV: 'development',
		},
	});

	assert(definition.id === 'web', 'id must be preserved');
});

test('ProcessDefinition rejects invalid fields', () => {
	assert.throws(
		() =>
			new ProcessDefinition({
				id: 'web',
				command: '',
				cwd: '.',
				env: {},
			}),
		'ProcessDefinition must reject invalid data',
	);
});
