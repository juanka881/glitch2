import type { DbClient } from '#src/db/client';
import type { AgentRunStatus, ProcessStatus } from '#src/agent/app/supervisor/supervisor-shapes';
import { AgentRunModel } from '#src/db/agent/models/agent-run-model';
import { ProcessRunModel } from '#src/db/agent/models/process-run-model';

interface CreateAgentRunInput {
	id: string;
	project_id: string;
	project_name: string;
	cwd: string;
	start_date: string;
	agent_version: string;
	status: AgentRunStatus;
	error?: unknown;
}

interface UpdateAgentRunInput {
	id: string;
	status: AgentRunStatus;
	end_date?: string | null;
	error?: unknown;
}

interface CreateProcessRunInput {
	id: string;
	agent_run_id: string;
	process_id: string;
	command: string;
	cwd: string;
	start_date: string;
	status: ProcessStatus;
}

interface UpdateProcessRunInput {
	id: string;
	status: ProcessStatus;
	pid?: number | null;
	end_date?: string | null;
	exit_code?: number | null;
	signal?: string | null;
}

type AgentRunRow = {
	id: string;
	project_id: string;
	project_name: string;
	cwd: string;
	start_date: string;
	end_date: string | null;
	agent_version: string;
	status: AgentRunStatus;
	error: string | null;
};

type ProcessRunRow = {
	id: string;
	agent_run_id: string;
	process_id: string;
	command: string;
	cwd: string;
	pid: number | null;
	start_date: string;
	end_date: string | null;
	exit_code: number | null;
	signal: string | null;
	status: ProcessStatus;
};

export class SupervisorRepo {
	private readonly db: DbClient;

	constructor(db: DbClient) {
		this.db = db;
	}

	createAgentRun(input: CreateAgentRunInput) {
		this.db.run(
			`
				INSERT INTO agent_runs (
					id, project_id, project_name, cwd, start_date, end_date, agent_version, status, error
				) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
			`,
			[
				input.id,
				input.project_id,
				input.project_name,
				input.cwd,
				input.start_date,
				input.agent_version,
				input.status,
				this.serializeJson(input.error ?? null),
			],
		);

		return this.getAgentRunById(input.id);
	}

	updateAgentRun(input: UpdateAgentRunInput) {
		this.db.run(
			`
				UPDATE agent_runs
				SET status = ?,
					end_date = ?,
					error = ?
				WHERE id = ?
			`,
			[input.status, input.end_date ?? null, this.serializeJson(input.error ?? null), input.id],
		);

		return this.getAgentRunById(input.id);
	}

	getAgentRunById(id: string) {
		const row = this.db.get<AgentRunRow>('SELECT * FROM agent_runs WHERE id = ?', [id]);

		if (!row) {
			throw new Error(`Agent run not found: ${id}`);
		}

		return new AgentRunModel({
			...row,
			error: row.error ? JSON.parse(row.error) : null,
		});
	}

	createProcessRun(input: CreateProcessRunInput) {
		this.db.run(
			`
				INSERT INTO process_runs (
					id, agent_run_id, process_id, command, cwd, pid, start_date, end_date, exit_code, signal, status
				) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, ?)
			`,
			[input.id, input.agent_run_id, input.process_id, input.command, input.cwd, input.start_date, input.status],
		);

		return this.getProcessRunById(input.id);
	}

	updateProcessRun(input: UpdateProcessRunInput) {
		this.db.run(
			`
				UPDATE process_runs
				SET status = ?,
					pid = COALESCE(?, pid),
					end_date = ?,
					exit_code = ?,
					signal = ?
				WHERE id = ?
			`,
			[
				input.status,
				input.pid ?? null,
				input.end_date ?? null,
				input.exit_code ?? null,
				input.signal ?? null,
				input.id,
			],
		);

		return this.getProcessRunById(input.id);
	}

	getProcessRunById(id: string) {
		const row = this.db.get<ProcessRunRow>('SELECT * FROM process_runs WHERE id = ?', [id]);

		if (!row) {
			throw new Error(`Process run not found: ${id}`);
		}

		return new ProcessRunModel(row);
	}

	listProcessRunsByAgentRunId(agentRunId: string) {
		const rows = this.db.all<ProcessRunRow>(
			'SELECT * FROM process_runs WHERE agent_run_id = ? ORDER BY start_date ASC',
			[agentRunId],
		);

		return rows.map((row) => new ProcessRunModel(row));
	}

	private serializeJson(value: unknown) {
		if (value === null) {
			return null;
		}

		return JSON.stringify(value);
	}
}
