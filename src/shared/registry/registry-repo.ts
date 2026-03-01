import type { DbClient } from '#src/db/client';
import { ProjectModel } from '#src/db/registry/models/project-model';
import { RegistryAgentModel } from '#src/db/registry/models/registry-agent-model';
import type { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';

interface UpsertProjectInput {
	id: string;
	name: string;
	cwd: string;
	cwdHash: string;
	addDate: string;
	lastPingDate: string;
}

interface UpdateProjectPingInput {
	id: string;
	lastPingDate: string;
}

interface UpdateProjectLatestAgentInput {
	id: string;
	latestAgentId: string;
}

interface CreateRegistryAgentInput {
	id: string;
	projectId: string;
	cwd: string;
	pid: number;
	startDate: string;
	pingDate: string;
	baseUrl: string;
	status: RegistryAgentStatus;
	error?: unknown;
}

interface UpdateRegistryAgentInput {
	id: string;
	status: RegistryAgentStatus;
	pingDate?: string;
	endDate?: string | null;
	error?: unknown;
}

type ProjectRow = {
	id: string;
	name: string;
	cwd: string;
	cwd_hash: string;
	add_date: string;
	last_ping_date: string;
	latest_agent_id: string | null;
};

type RegistryAgentRow = {
	id: string;
	project_id: string;
	cwd: string;
	pid: number;
	start_date: string;
	end_date: string | null;
	ping_date: string;
	base_url: string;
	status: RegistryAgentStatus;
	error: string | null;
};

export class RegistryRepo {
	private readonly db: DbClient;

	constructor(db: DbClient) {
		this.db = db;
	}

	upsertProject(input: UpsertProjectInput) {
		this.db.run(
			`
				INSERT INTO projects (
					id, name, cwd, cwd_hash, add_date, last_ping_date, latest_agent_id
				) VALUES (?, ?, ?, ?, ?, ?, NULL)
				ON CONFLICT(cwd_hash) DO UPDATE SET
					name = excluded.name,
					cwd = excluded.cwd,
					last_ping_date = excluded.last_ping_date
			`,
			[input.id, input.name, input.cwd, input.cwdHash, input.addDate, input.lastPingDate],
		);

		const project = this.getProjectByCwdHash(input.cwdHash);

		if (!project) {
			throw new Error(`Project not found after upsert: ${input.cwdHash}`);
		}

		return project;
	}

	updateProjectPing(input: UpdateProjectPingInput) {
		this.db.run('UPDATE projects SET last_ping_date = ? WHERE id = ?', [input.lastPingDate, input.id]);

		return this.getProjectById(input.id);
	}

	updateProjectLatestAgent(input: UpdateProjectLatestAgentInput) {
		this.db.run('UPDATE projects SET latest_agent_id = ? WHERE id = ?', [input.latestAgentId, input.id]);

		return this.getProjectById(input.id);
	}

	getProjectById(id: string) {
		const row = this.db.get<ProjectRow>('SELECT * FROM projects WHERE id = ?', [id]);
		if (!row) {
			return null;
		}

		return new ProjectModel(row);
	}

	getProjectByCwdHash(cwdHash: string) {
		const row = this.db.get<ProjectRow>('SELECT * FROM projects WHERE cwd_hash = ?', [cwdHash]);
		if (!row) {
			return null;
		}

		return new ProjectModel(row);
	}

	createAgent(input: CreateRegistryAgentInput) {
		this.db.run(
			`
				INSERT INTO agents (
					id, project_id, cwd, pid, start_date, end_date, ping_date, base_url, status, error
				) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
			`,
			[
				input.id,
				input.projectId,
				input.cwd,
				input.pid,
				input.startDate,
				input.pingDate,
				input.baseUrl,
				input.status,
				this.serializeJson(input.error ?? null),
			],
		);

		return this.getAgentById(input.id);
	}

	updateAgent(input: UpdateRegistryAgentInput) {
		const current = this.getAgentById(input.id);

		this.db.run(
			`
				UPDATE agents
				SET status = ?,
					ping_date = ?,
					end_date = ?,
					error = ?
				WHERE id = ?
			`,
			[
				input.status,
				input.pingDate ?? current.ping_date,
				input.endDate ?? current.end_date,
				this.serializeJson(input.error ?? current.error),
				input.id,
			],
		);

		return this.getAgentById(input.id);
	}

	markStaleAgentsAsCrash(cutoffDate: string, crashDate: string) {
		this.db.run(
			`
				UPDATE agents
				SET status = ?, end_date = ?
				WHERE status IN (?, ?)
					AND ping_date < ?
			`,
			['crash', crashDate, 'start', 'running', cutoffDate],
		);
	}

	getAgentById(id: string) {
		const row = this.db.get<RegistryAgentRow>('SELECT * FROM agents WHERE id = ?', [id]);

		if (!row) {
			throw new Error(`Registry agent not found: ${id}`);
		}

		return new RegistryAgentModel({
			...row,
			error: row.error ? JSON.parse(row.error) : null,
		});
	}

	listAgents() {
		const rows = this.db.all<RegistryAgentRow>('SELECT * FROM agents ORDER BY start_date ASC');

		return rows.map((row) => {
			return new RegistryAgentModel({
				...row,
				error: row.error ? JSON.parse(row.error) : null,
			});
		});
	}

	private serializeJson(value: unknown) {
		if (value === null) {
			return null;
		}

		return JSON.stringify(value);
	}
}
