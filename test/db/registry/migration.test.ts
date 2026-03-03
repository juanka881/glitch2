import assert from 'node:assert/strict';
import { test } from 'vitest';
import { migrations } from '#src/db/registry/migrations';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';

test('registry migrations create the registry schema', () => {
	const db = DbClient.memory();

	try {
		const migrator = new Migrator(db);
		migrator.apply(migrations);

		const projects = db.get<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
		);
		const agents = db.get<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agents'");

		assert(projects?.name === 'projects', 'projects table must exist');
		assert(agents?.name === 'agents', 'agents table must exist');
	} finally {
		db.close();
	}
});

test('registry migrations are idempotent', () => {
	const db = DbClient.memory();

	try {
		const migrator = new Migrator(db);
		migrator.apply(migrations);
		migrator.apply(migrations);

		const applied = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM glitch_migrations');

		assert(applied?.total === migrations.length, 'each registry migration should be recorded only once');
	} finally {
		db.close();
	}
});
