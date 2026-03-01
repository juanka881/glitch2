import type { DbClient } from '#src/db/client';
import type { Migration } from '#src/db/migration';

function apply(db: DbClient) {
	db.run(`
		CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			cwd TEXT NOT NULL,
			cwd_hash TEXT NOT NULL UNIQUE,
			add_date TEXT NOT NULL,
			last_ping_date TEXT NOT NULL,
			latest_agent_id TEXT
		)
	`);
	db.run(`
		CREATE TABLE IF NOT EXISTS agents (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL REFERENCES projects(id),
			cwd TEXT NOT NULL,
			pid INTEGER NOT NULL,
			start_date TEXT NOT NULL,
			end_date TEXT,
			ping_date TEXT NOT NULL,
			base_url TEXT NOT NULL,
			status TEXT NOT NULL,
			error TEXT
		)
	`);
	db.run(`
		CREATE INDEX IF NOT EXISTS idx_projects_latest_agent_id
		ON projects (latest_agent_id)
	`);
	db.run(`
		CREATE INDEX IF NOT EXISTS idx_agents_project_id_start_date
		ON agents (project_id, start_date)
	`);
	db.run(`
		CREATE INDEX IF NOT EXISTS idx_agents_status_ping_date
		ON agents (status, ping_date)
	`);
}

function revert(db: DbClient) {
	db.run('DROP INDEX IF EXISTS idx_agents_status_ping_date');
	db.run('DROP INDEX IF EXISTS idx_agents_project_id_start_date');
	db.run('DROP INDEX IF EXISTS idx_projects_latest_agent_id');
	db.run('DROP TABLE IF EXISTS agents');
	db.run('DROP TABLE IF EXISTS projects');
}

export const registryMigration: Migration = {
	key: '20260301-registry',
	apply,
	revert,
};
