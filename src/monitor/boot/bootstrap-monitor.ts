import path from 'node:path';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';
import { migrations as registryMigrations } from '#src/db/registry/migrations';
import {
	NodeMonitorProcessManager,
	type MonitorProcessManager,
} from '#src/monitor/app/monitor/monitor-process-manager';
import { MonitorQueryService } from '#src/monitor/app/monitor/monitor-query-service';
import { MonitorRepo } from '#src/monitor/app/monitor/monitor-repo';
import { MonitorService } from '#src/monitor/app/monitor/monitor-service';
import { AgentDbService } from '#src/shared/agent-db/agent-db-service';
import { RegistryRepo } from '#src/shared/registry/registry-repo';
import { RegistryService } from '#src/shared/registry/registry-service';
import { ensureGlitchHome } from '#src/shared/utils/glitch-home';

export interface BootstrapMonitorRuntime {
	glitchHome: string;
	processManager: MonitorProcessManager;
	registry: RegistryService;
	registryDb: DbClient;
	agentDb: AgentDbService;
	monitor: MonitorService;
	query: MonitorQueryService;
}

export async function bootstrapMonitor(glitchHome?: string): Promise<BootstrapMonitorRuntime> {
	const resolvedGlitchHome = await ensureGlitchHome(glitchHome);
	const registryPath = path.resolve(resolvedGlitchHome, 'registry.glitch');
	const registryDb = DbClient.open(registryPath);
	const registryMigrator = new Migrator(registryDb);
	registryMigrator.apply(registryMigrations);

	const registryRepo = new RegistryRepo(registryDb);
	const registry = new RegistryService(registryRepo);
	const monitorRepo = new MonitorRepo(resolvedGlitchHome);
	const processManager = new NodeMonitorProcessManager();
	const monitor = new MonitorService(monitorRepo, registry, processManager);
	const agentDb = new AgentDbService();
	const query = new MonitorQueryService(monitor, registry, agentDb);

	return {
		glitchHome: resolvedGlitchHome,
		processManager,
		registry,
		registryDb,
		agentDb,
		monitor,
		query,
	};
}
