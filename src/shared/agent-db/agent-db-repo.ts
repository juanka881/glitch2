import type { DbClient } from '#src/db/client';
import { AgentRunModel } from '#src/db/agent/models/agent-run-model';
import { ProcessRunModel } from '#src/db/agent/models/process-run-model';
import type { AgentRunStatus, ProcessStatus } from '#src/agent/app/supervisor/supervisor-shapes';

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

export class AgentDbRepo {
	private readonly db: DbClient;

	constructor(db: DbClient) {
		this.db = db;
	}

	getAgentRunById(id: string): AgentRunModel | null {
		const row = this.db.get<AgentRunRow>('SELECT * FROM agent_runs WHERE id = ?', [id]);

		if (!row) {
			return null;
		}

		return new AgentRunModel({
			...row,
			error: row.error ? JSON.parse(row.error) : null,
		});
	}

	listProcessRunsByAgentRunId(agentRunId: string): ProcessRunModel[] {
		const rows = this.db.all<ProcessRunRow>(
			'SELECT * FROM process_runs WHERE agent_run_id = ? ORDER BY start_date ASC',
			[agentRunId],
		);

		return rows.map((row) => new ProcessRunModel(row));
	}

	getProcessRunById(id: string): ProcessRunModel | null {
		const row = this.db.get<ProcessRunRow>('SELECT * FROM process_runs WHERE id = ?', [id]);

		if (!row) {
			return null;
		}

		return new ProcessRunModel(row);
	}
}
