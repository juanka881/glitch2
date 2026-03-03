import type { AgentRunModel } from '#src/db/agent/models/agent-run-model';
import type { ProcessRunModel } from '#src/db/agent/models/process-run-model';
import type { ProjectModel } from '#src/db/registry/models/project-model';
import type { RegistryAgentModel } from '#src/db/registry/models/registry-agent-model';
import type { MonitorStatus } from '#src/monitor/app/monitor/monitor-shapes';
import type { MonitorService } from '#src/monitor/app/monitor/monitor-service';
import type { AgentDbService } from '#src/shared/agent-db/agent-db-service';
import type { RegistryService } from '#src/shared/registry/registry-service';

export interface ProjectDetails {
	project: ProjectModel;
	latestAgent: RegistryAgentModel | null;
	agents: RegistryAgentModel[];
}

export interface AgentDetails {
	agent: RegistryAgentModel;
	project: ProjectModel | null;
}

export interface ProcessListDetails {
	agent: RegistryAgentModel;
	project: ProjectModel;
	agentRun: AgentRunModel;
	processes: ProcessRunModel[];
}

export interface ProcessDetails {
	agent: RegistryAgentModel;
	project: ProjectModel;
	agentRun: AgentRunModel;
	process: ProcessRunModel;
}

export class MonitorQueryService {
	private readonly monitor: MonitorService;
	private readonly registry: RegistryService;
	private readonly agentDb: AgentDbService;

	constructor(monitor: MonitorService, registry: RegistryService, agentDb: AgentDbService) {
		this.monitor = monitor;
		this.registry = registry;
		this.agentDb = agentDb;
	}

	async getMonitorStatus(): Promise<MonitorStatus | undefined> {
		return await this.monitor.getStatus();
	}

	getProjects(): ProjectModel[] {
		return this.registry.listProjects();
	}

	getProject(projectId: string): ProjectDetails | null {
		const project = this.registry.getProjectById(projectId);

		if (!project) {
			return null;
		}

		const agents = this.registry.listAgentsByProjectId(project.id);
		const latestAgent = project.latest_agent_id ? this.registry.getAgentById(project.latest_agent_id) : null;

		return {
			project,
			latestAgent,
			agents,
		};
	}

	getAgents(): RegistryAgentModel[] {
		return this.registry.listAgents();
	}

	getAgent(agentId: string): AgentDetails | null {
		const agent = this.registry.getAgentById(agentId);

		if (!agent) {
			return null;
		}

		const project = this.registry.getProjectById(agent.project_id);

		return {
			agent,
			project,
		};
	}

	async getProcesses(agentId: string): Promise<ProcessListDetails | null> {
		const details = this.getAgent(agentId);

		if (!details?.project) {
			return null;
		}

		const agentRun = await this.agentDb.getAgentRun(details.project.cwd, details.agent.id);

		if (!agentRun) {
			return null;
		}

		const processes = await this.agentDb.listProcessRuns(details.project.cwd, details.agent.id);

		return {
			agent: details.agent,
			project: details.project,
			agentRun,
			processes,
		};
	}

	async getProcess(agentId: string, processRunId: string): Promise<ProcessDetails | null> {
		const details = await this.getProcesses(agentId);

		if (!details) {
			return null;
		}

		const process = await this.agentDb.getProcessRun(details.project.cwd, processRunId);

		if (!process || process.agent_run_id !== details.agentRun.id) {
			return null;
		}

		return {
			agent: details.agent,
			project: details.project,
			agentRun: details.agentRun,
			process,
		};
	}
}
