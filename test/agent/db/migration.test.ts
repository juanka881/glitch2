import assert from 'node:assert/strict';
import { test } from 'vitest';
import { migrations } from '#src/db/agent/migrations';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';

test('applyMigrations creates the supervision schema', () => {
	const db = DbClient.memory();

	try {
		const migrator = new Migrator(db);
		migrator.apply(migrations);

		const agentRuns = db.get<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agent_runs'",
		);
		const processRuns = db.get<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'process_runs'",
		);

		assert(agentRuns?.name === 'agent_runs', 'agent_runs table must exist');
		assert(processRuns?.name === 'process_runs', 'process_runs table must exist');
	} finally {
		db.close();
	}
});

test('applyMigrations is idempotent', () => {
	const db = DbClient.memory();

	try {
		const migrator = new Migrator(db);
		migrator.apply(migrations);
		migrator.apply(migrations);

		const applied = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM glitch_migrations');
		assert(applied?.total === 1, 'migration should be recorded only once');
	} finally {
		db.close();
	}
});

