import type { DbClient } from '#src/agent/db/client';

export interface Migration {
	key: string;
	apply(db: DbClient): void;
	revert(db: DbClient): void;
}

export class Migrator {
	private readonly db: DbClient;

	constructor(db: DbClient) {
		this.db = db;
	}

	apply(migrations: Migration[]) {
		this.db.transaction(() => {
			this.db.run(`
				CREATE TABLE IF NOT EXISTS glitch_migrations (
					key TEXT PRIMARY KEY,
					apply_date TEXT NOT NULL
				)
			`);

			for (const migration of migrations) {
				const existing = this.db.get<{ key: string }>(
					'SELECT key FROM glitch_migrations WHERE key = ?',
					[migration.key],
				);

				if (existing) {
					continue;
				}

				migration.apply(this.db);
				this.db.run(
					'INSERT INTO glitch_migrations (key, apply_date) VALUES (?, ?)',
					[migration.key, new Date().toISOString()],
				);
			}
		});
	}

	revert(migrations: Migration[]) {
		const reversedMigrations = [...migrations].reverse();

		this.db.transaction(() => {
			this.db.run(`
				CREATE TABLE IF NOT EXISTS glitch_migrations (
					key TEXT PRIMARY KEY,
					apply_date TEXT NOT NULL
				)
			`);

			for (const migration of reversedMigrations) {
				const existing = this.db.get<{ key: string }>(
					'SELECT key FROM glitch_migrations WHERE key = ?',
					[migration.key],
				);

				if (!existing) {
					continue;
				}

				migration.revert(this.db);
				this.db.run('DELETE FROM glitch_migrations WHERE key = ?', [
					migration.key,
				]);
			}
		});
	}
}
