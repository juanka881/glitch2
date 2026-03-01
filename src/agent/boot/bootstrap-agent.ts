import fsp from 'node:fs/promises';
import path from 'node:path';
import { v7 as uuidv7 } from 'uuid';
import { SupervisorRepo } from '#src/agent/app/supervisor/supervisor-repo';
import { SupervisorService } from '#src/agent/app/supervisor/supervisor-service';
import { migrations } from '#src/db/agent/migrations';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';
import { migrations as registryMigrations } from '#src/db/registry/migrations';
import { loadConfig } from '#src/agent/boot/load-config';
import { RegistryRepo } from '#src/shared/registry/registry-repo';
import { RegistryService } from '#src/shared/registry/registry-service';
import { reserveBaseUrl } from '#src/shared/utils/base-url';
import { ensureGlitchHome } from '#src/shared/utils/glitch-home';

export async function bootstrapAgent(cwd: string, glitchHome?: string) {
	const config = await loadConfig(cwd);
	const agentId = uuidv7();
	const resolvedGlitchHome = await ensureGlitchHome(glitchHome);
	const dbPath = path.resolve(cwd, '.glitch', 'agent.glitch');
	const registryPath = path.resolve(resolvedGlitchHome, 'registry.glitch');
	const baseUrl = await reserveBaseUrl();

	await fsp.mkdir(path.dirname(dbPath), { recursive: true });

	const agentDb = DbClient.open(dbPath);
	const agentMigrator = new Migrator(agentDb);
	agentMigrator.apply(migrations);

	const registryDb = DbClient.open(registryPath);
	const registryMigrator = new Migrator(registryDb);
	registryMigrator.apply(registryMigrations);

	const repo = new SupervisorRepo(agentDb);
	const supervisor = new SupervisorService(repo);
	const registryRepo = new RegistryRepo(registryDb);
	const registry = new RegistryService(registryRepo);
	const project = registry.ensureProject({
		name: config.name,
		cwd,
		pingDate: new Date().toISOString(),
	});

	return {
		agentId,
		baseUrl,
		config,
		projectId: project.id,
		glitchHome: resolvedGlitchHome,
		agentDb,
		registryDb,
		repo,
		registry,
		supervisor,
	};
}
