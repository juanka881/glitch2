import * as z from 'zod';
import { AgentRunStatus, ProcessStatus, ProcessStream } from '#src/agent/app/supervisor/supervisor-shapes';
import { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';

const agentRunStatusSchema = z.enum(AgentRunStatus);
const processStatusSchema = z.enum(ProcessStatus);
const processStreamSchema = z.enum(ProcessStream);
const registryAgentStatusSchema = z.enum(RegistryAgentStatus);

export class GetMonitorInput {
	static schema = z.object({});

	constructor(fields: unknown) {
		GetMonitorInput.schema.parse(fields);
	}
}

export class GetMonitorOutput {
	static schema = z.object({
		pid: z.number().int().positive(),
		start_date: z.string().min(1),
		base_url: z.string().min(1),
		version: z.string().min(1),
		healthy: z.boolean(),
	});

	readonly pid!: number;
	readonly start_date!: string;
	readonly base_url!: string;
	readonly version!: string;
	readonly healthy!: boolean;

	constructor(fields: unknown) {
		const parsed = GetMonitorOutput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class ProjectRecord {
	static schema = z.object({
		id: z.uuid(),
		name: z.string().min(1),
		cwd: z.string().min(1),
		add_date: z.string().min(1),
		last_ping_date: z.string().min(1),
		latest_agent_id: z.uuid().nullable(),
	});

	readonly id!: string;
	readonly name!: string;
	readonly cwd!: string;
	readonly add_date!: string;
	readonly last_ping_date!: string;
	readonly latest_agent_id!: string | null;

	constructor(fields: unknown) {
		const parsed = ProjectRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class AgentRecord {
	static schema = z.object({
		id: z.uuid(),
		project_id: z.uuid(),
		cwd: z.string().min(1),
		pid: z.number().int(),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		ping_date: z.string().min(1),
		base_url: z.string().min(1),
		status: registryAgentStatusSchema,
		error: z.unknown().nullable(),
	});

	readonly id!: string;
	readonly project_id!: string;
	readonly cwd!: string;
	readonly pid!: number;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly ping_date!: string;
	readonly base_url!: string;
	readonly status!: RegistryAgentStatus;
	readonly error!: unknown;

	constructor(fields: unknown) {
		const parsed = AgentRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class AgentRunRecord {
	static schema = z.object({
		id: z.uuid(),
		project_id: z.uuid(),
		project_name: z.string().min(1),
		cwd: z.string().min(1),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		agent_version: z.string().min(1),
		status: agentRunStatusSchema,
		error: z.unknown().nullable(),
	});

	readonly id!: string;
	readonly project_id!: string;
	readonly project_name!: string;
	readonly cwd!: string;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly agent_version!: string;
	readonly status!: AgentRunStatus;
	readonly error!: unknown;

	constructor(fields: unknown) {
		const parsed = AgentRunRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class ProcessRecord {
	static schema = z.object({
		id: z.uuid(),
		agent_run_id: z.uuid(),
		process_id: z.string().min(1),
		command: z.string().min(1),
		cwd: z.string().min(1),
		pid: z.number().int().nullable(),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		exit_code: z.number().int().nullable(),
		signal: z.string().min(1).nullable(),
		status: processStatusSchema,
	});

	readonly id!: string;
	readonly agent_run_id!: string;
	readonly process_id!: string;
	readonly command!: string;
	readonly cwd!: string;
	readonly pid!: number | null;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly exit_code!: number | null;
	readonly signal!: string | null;
	readonly status!: ProcessStatus;

	constructor(fields: unknown) {
		const parsed = ProcessRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class StreamLineRecordOutput {
	static schema = z.object({
		agent_id: z.uuid(),
		process_id: z.string().min(1),
		process_run_id: z.uuid(),
		capture_date: z.string().min(1),
		stream: processStreamSchema,
		line: z.string(),
	});

	readonly agent_id!: string;
	readonly process_id!: string;
	readonly process_run_id!: string;
	readonly capture_date!: string;
	readonly stream!: ProcessStream;
	readonly line!: string;

	constructor(fields: unknown) {
		const parsed = StreamLineRecordOutput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetProjectListInput {
	static schema = z.object({});

	constructor(fields: unknown) {
		GetProjectListInput.schema.parse(fields);
	}
}

export class GetProjectListOutput {
	static schema = z.object({
		projects: z.array(ProjectRecord.schema),
	});

	readonly projects!: ProjectRecord[];

	constructor(fields: unknown) {
		const parsed = GetProjectListOutput.schema.parse(fields);
		const projects = parsed.projects.map((project) => new ProjectRecord(project));

		Object.assign(this, parsed, { projects });
	}
}

export class GetProjectInput {
	static schema = z.object({
		project_id: z.uuid(),
	});

	readonly project_id!: string;

	constructor(fields: unknown) {
		const parsed = GetProjectInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetProjectOutput {
	static schema = z.object({
		project: ProjectRecord.schema,
		latest_agent: AgentRecord.schema.nullable(),
		agents: z.array(AgentRecord.schema),
	});

	readonly project!: ProjectRecord;
	readonly latest_agent!: AgentRecord | null;
	readonly agents!: AgentRecord[];

	constructor(fields: unknown) {
		const parsed = GetProjectOutput.schema.parse(fields);
		const project = new ProjectRecord(parsed.project);
		const latestAgent = parsed.latest_agent ? new AgentRecord(parsed.latest_agent) : null;
		const agents = parsed.agents.map((agent) => new AgentRecord(agent));

		Object.assign(this, parsed, {
			project,
			latest_agent: latestAgent,
			agents,
		});
	}
}

export class GetAgentListInput {
	static schema = z.object({});

	constructor(fields: unknown) {
		GetAgentListInput.schema.parse(fields);
	}
}

export class GetAgentListOutput {
	static schema = z.object({
		agents: z.array(AgentRecord.schema),
	});

	readonly agents!: AgentRecord[];

	constructor(fields: unknown) {
		const parsed = GetAgentListOutput.schema.parse(fields);
		const agents = parsed.agents.map((agent) => new AgentRecord(agent));

		Object.assign(this, parsed, { agents });
	}
}

export class GetAgentInput {
	static schema = z.object({
		agent_id: z.uuid(),
	});

	readonly agent_id!: string;

	constructor(fields: unknown) {
		const parsed = GetAgentInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetAgentOutput {
	static schema = z.object({
		agent: AgentRecord.schema,
		project: ProjectRecord.schema.nullable(),
	});

	readonly agent!: AgentRecord;
	readonly project!: ProjectRecord | null;

	constructor(fields: unknown) {
		const parsed = GetAgentOutput.schema.parse(fields);
		const agent = new AgentRecord(parsed.agent);
		const project = parsed.project ? new ProjectRecord(parsed.project) : null;

		Object.assign(this, parsed, {
			agent,
			project,
		});
	}
}

export class GetProcessListInput {
	static schema = z.object({
		agent_id: z.uuid(),
	});

	readonly agent_id!: string;

	constructor(fields: unknown) {
		const parsed = GetProcessListInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetProcessListOutput {
	static schema = z.object({
		agent: AgentRecord.schema,
		project: ProjectRecord.schema,
		agent_run: AgentRunRecord.schema,
		processes: z.array(ProcessRecord.schema),
	});

	readonly agent!: AgentRecord;
	readonly project!: ProjectRecord;
	readonly agent_run!: AgentRunRecord;
	readonly processes!: ProcessRecord[];

	constructor(fields: unknown) {
		const parsed = GetProcessListOutput.schema.parse(fields);
		const agent = new AgentRecord(parsed.agent);
		const project = new ProjectRecord(parsed.project);
		const agentRun = new AgentRunRecord(parsed.agent_run);
		const processes = parsed.processes.map((process) => new ProcessRecord(process));

		Object.assign(this, parsed, {
			agent,
			project,
			agent_run: agentRun,
			processes,
		});
	}
}

export class GetProcessInput {
	static schema = z.object({
		agent_id: z.uuid(),
		process_run_id: z.uuid(),
	});

	readonly agent_id!: string;
	readonly process_run_id!: string;

	constructor(fields: unknown) {
		const parsed = GetProcessInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetProcessOutput {
	static schema = z.object({
		agent: AgentRecord.schema,
		project: ProjectRecord.schema,
		agent_run: AgentRunRecord.schema,
		process: ProcessRecord.schema,
	});

	readonly agent!: AgentRecord;
	readonly project!: ProjectRecord;
	readonly agent_run!: AgentRunRecord;
	readonly process!: ProcessRecord;

	constructor(fields: unknown) {
		const parsed = GetProcessOutput.schema.parse(fields);
		const agent = new AgentRecord(parsed.agent);
		const project = new ProjectRecord(parsed.project);
		const agentRun = new AgentRunRecord(parsed.agent_run);
		const process = new ProcessRecord(parsed.process);

		Object.assign(this, parsed, {
			agent,
			project,
			agent_run: agentRun,
			process,
		});
	}
}

export class GetProcessLogInput {
	static schema = z.object({
		agent_id: z.uuid(),
		process_run_id: z.uuid(),
	});

	readonly agent_id!: string;
	readonly process_run_id!: string;

	constructor(fields: unknown) {
		const parsed = GetProcessLogInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class GetProcessLogOutput {
	static schema = z.object({
		lines: z.array(StreamLineRecordOutput.schema),
	});

	readonly lines!: StreamLineRecordOutput[];

	constructor(fields: unknown) {
		const parsed = GetProcessLogOutput.schema.parse(fields);
		const lines = parsed.lines.map((line) => new StreamLineRecordOutput(line));

		Object.assign(this, parsed, { lines });
	}
}
