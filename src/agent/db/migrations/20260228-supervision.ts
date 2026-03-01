import type { DbClient } from '#src/agent/db/client';
import type { Migration } from '#src/agent/db/migration';

function apply(db: DbClient) {
	db.run(`
		CREATE TABLE IF NOT EXISTS agent_runs (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			project_name TEXT NOT NULL,
			cwd TEXT NOT NULL,
			start_date TEXT NOT NULL,
			end_date TEXT,
			agent_version TEXT NOT NULL,
			status TEXT NOT NULL,
			error TEXT
		)
	`);
	db.run(`
		CREATE TABLE IF NOT EXISTS process_runs (
			id TEXT PRIMARY KEY,
			agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
			process_id TEXT NOT NULL,
			command TEXT NOT NULL,
			cwd TEXT NOT NULL,
			pid INTEGER,
			start_date TEXT NOT NULL,
			end_date TEXT,
			exit_code INTEGER,
			signal TEXT,
			status TEXT NOT NULL
		)
	`);
	db.run(`
		CREATE INDEX IF NOT EXISTS idx_process_runs_agent_run_id_process_id
		ON process_runs (agent_run_id, process_id)
	`);
	db.run(`
		CREATE INDEX IF NOT EXISTS idx_process_runs_start_date
		ON process_runs (start_date)
	`);
}

function revert(db: DbClient) {
	db.run('DROP INDEX IF EXISTS idx_process_runs_start_date');
	db.run('DROP INDEX IF EXISTS idx_process_runs_agent_run_id_process_id');
	db.run('DROP TABLE IF EXISTS process_runs');
	db.run('DROP TABLE IF EXISTS agent_runs');
}

export const supervisionMigration: Migration = {
	key: '20260228-supervision',
	apply,
	revert,
};
