import crypto from 'node:crypto';
import path from 'node:path';
import { v7 as uuidv7 } from 'uuid';
import type { ProjectModel } from '#src/db/registry/models/project-model';
import type { RegistryAgentModel } from '#src/db/registry/models/registry-agent-model';
import type { RegistryRepo } from '#src/shared/registry/registry-repo';
import { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';

interface EnsureProjectInput {
	name: string;
	cwd: string;
	pingDate: string;
}

interface RegisterAgentStartInput {
	agentId: string;
	projectId: string;
	cwd: string;
	pid: number;
	startDate: string;
	pingDate: string;
	baseUrl: string;
}

interface UpdateAgentRunningInput {
	agentId: string;
	projectId: string;
	pingDate: string;
}

interface PingAgentInput {
	agentId: string;
	projectId: string;
	pingDate: string;
}

interface ExitAgentInput {
	agentId: string;
	endDate: string;
	error?: unknown;
}

interface FailAgentInput {
	agentId: string;
	endDate: string;
	error: unknown;
}

export class RegistryService {
	private readonly repo: RegistryRepo;

	constructor(repo: RegistryRepo) {
		this.repo = repo;
	}

	ensureProject(input: EnsureProjectInput): ProjectModel {
		const cwdHash = hashCwd(input.cwd);
		const existingProject = this.repo.getProjectByCwdHash(cwdHash);
		const projectId = existingProject?.id ?? uuidv7();

		return this.repo.upsertProject({
			id: projectId,
			name: input.name,
			cwd: input.cwd,
			cwdHash,
			addDate: input.pingDate,
			lastPingDate: input.pingDate,
		});
	}

	registerAgentStart(input: RegisterAgentStartInput): RegistryAgentModel {
		return this.repo.createAgent({
			id: input.agentId,
			projectId: input.projectId,
			cwd: input.cwd,
			pid: input.pid,
			startDate: input.startDate,
			pingDate: input.pingDate,
			baseUrl: input.baseUrl,
			status: RegistryAgentStatus.Start,
		});
	}

	markAgentRunning(input: UpdateAgentRunningInput): RegistryAgentModel {
		this.repo.updateProjectLatestAgent({
			id: input.projectId,
			latestAgentId: input.agentId,
		});
		this.repo.updateProjectPing({
			id: input.projectId,
			lastPingDate: input.pingDate,
		});

		return this.repo.updateAgent({
			id: input.agentId,
			status: RegistryAgentStatus.Running,
			pingDate: input.pingDate,
		});
	}

	pingAgent(input: PingAgentInput): RegistryAgentModel {
		this.repo.updateProjectPing({
			id: input.projectId,
			lastPingDate: input.pingDate,
		});

		return this.repo.updateAgent({
			id: input.agentId,
			status: RegistryAgentStatus.Running,
			pingDate: input.pingDate,
		});
	}

	markAgentExit(input: ExitAgentInput): RegistryAgentModel {
		return this.repo.updateAgent({
			id: input.agentId,
			status: RegistryAgentStatus.Exit,
			endDate: input.endDate,
			error: input.error ?? null,
		});
	}

	markAgentFail(input: FailAgentInput): RegistryAgentModel {
		return this.repo.updateAgent({
			id: input.agentId,
			status: RegistryAgentStatus.Fail,
			endDate: input.endDate,
			error: input.error,
		});
	}

	markCrashedAgents(cutoffDate: string, crashDate: string): void {
		this.repo.markStaleAgentsAsCrash(cutoffDate, crashDate);
	}
}

function hashCwd(cwd: string): string {
	const normalizedCwd = path.normalize(path.resolve(cwd)).toLowerCase();

	return crypto.createHash('sha256').update(normalizedCwd).digest('hex').toUpperCase();
}
