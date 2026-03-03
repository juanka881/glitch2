import fsp from 'node:fs/promises';
import path from 'node:path';
import { DbClient } from '#src/db/client';
import type { AgentRunModel } from '#src/db/agent/models/agent-run-model';
import type { ProcessRunModel } from '#src/db/agent/models/process-run-model';
import { AgentDbRepo } from '#src/shared/agent-db/agent-db-repo';

interface CachedAgentDb {
	db: DbClient;
	repo: AgentDbRepo;
}

export class AgentDbService {
	private readonly dbByPath: Map<string, CachedAgentDb>;

	constructor() {
		this.dbByPath = new Map();
	}

	async getAgentRun(cwd: string, agentRunId: string): Promise<AgentRunModel | null> {
		const repo = await this.getRepo(cwd);
		return repo.getAgentRunById(agentRunId);
	}

	async listProcessRuns(cwd: string, agentRunId: string): Promise<ProcessRunModel[]> {
		const repo = await this.getRepo(cwd);
		return repo.listProcessRunsByAgentRunId(agentRunId);
	}

	async getProcessRun(cwd: string, processRunId: string): Promise<ProcessRunModel | null> {
		const repo = await this.getRepo(cwd);
		return repo.getProcessRunById(processRunId);
	}

	closeAll(): void {
		for (const cachedDb of this.dbByPath.values()) {
			cachedDb.db.close();
		}

		this.dbByPath.clear();
	}

	private async getRepo(cwd: string): Promise<AgentDbRepo> {
		const dbPath = path.resolve(cwd, '.glitch', 'agent.glitch');
		const cachedDb = this.dbByPath.get(dbPath);

		if (cachedDb) {
			return cachedDb.repo;
		}

		await fsp.access(dbPath);

		const db = DbClient.openReadonly(dbPath);
		const repo = new AgentDbRepo(db);

		this.dbByPath.set(dbPath, {
			db,
			repo,
		});

		return repo;
	}
}
