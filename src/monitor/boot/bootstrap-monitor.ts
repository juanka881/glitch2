import path from 'node:path';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';
import { migrations as registryMigrations } from '#src/db/registry/migrations';
import { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { MonitorService } from '#src/monitor/app/monitor/monitor-service';
import { RegistryRepo } from '#src/shared/registry/registry-repo';
import { RegistryService } from '#src/shared/registry/registry-service';
import { ensureGlitchHome } from '#src/shared/utils/glitch-home';

export async function bootstrapMonitor(glitchHome?: string) {
	const resolvedGlitchHome = await ensureGlitchHome(glitchHome);
	const registryPath = path.resolve(resolvedGlitchHome, 'registry.glitch');
	const registryDb = DbClient.open(registryPath);
	const registryMigrator = new Migrator(registryDb);
	registryMigrator.apply(registryMigrations);

	const registryRepo = new RegistryRepo(registryDb);
	const registry = new RegistryService(registryRepo);
	const repo = new MonitorRepo(resolvedGlitchHome);
	const monitor = new MonitorService(repo, registry);

	return {
		glitchHome: resolvedGlitchHome,
		registry,
		registryDb,
		monitor,
	};
}
