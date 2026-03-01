import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SupervisorRepo } from '#src/agent/app/supervisor/repo';
import { SupervisorService } from '#src/agent/app/supervisor/service';
import { DbClient } from '#src/agent/db/client';
import { migrations } from '#src/agent/db/migrations';
import { Migrator } from '#src/agent/db/migration';
import { loadConfig } from '#src/agent/boot/load-config';
import { loadOrCreateProjectId } from '#src/agent/boot/project-id';

export async function bootstrapAgent(cwd: string) {
	const config = await loadConfig(cwd);
	const projectId = await loadOrCreateProjectId(cwd);
	const dbPath = resolve(cwd, '.glitch', 'glitch.sqlite');

	await mkdir(dirname(dbPath), { recursive: true });

	const db = DbClient.open(dbPath);
	const migrator = new Migrator(db);
	migrator.apply(migrations);

	const repo = new SupervisorRepo(db);
	const supervisor = new SupervisorService(repo);

	return {
		config,
		projectId,
		db,
		repo,
		supervisor,
	};
}
