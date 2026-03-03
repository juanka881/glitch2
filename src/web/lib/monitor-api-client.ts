import {
	GetAgentListOutput,
	GetAgentOutput,
	GetMonitorOutput,
	GetProcessLogOutput,
	GetProcessListOutput,
	GetProcessOutput,
	GetProjectListOutput,
	GetProjectOutput,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';

export interface MonitorApiClientLike {
	getMonitor(): Promise<GetMonitorOutput>;
	getProjectList(): Promise<GetProjectListOutput>;
	getProject(projectId: string): Promise<GetProjectOutput>;
	getAgentList(): Promise<GetAgentListOutput>;
	getAgent(agentId: string): Promise<GetAgentOutput>;
	getProcessList(agentId: string): Promise<GetProcessListOutput>;
	getProcess(agentId: string, processRunId: string): Promise<GetProcessOutput>;
	getProcessLog(agentId: string, processRunId: string): Promise<GetProcessLogOutput>;
}

export class MonitorApiClient {
	private readonly baseUrl: string;

	constructor(baseUrl = '') {
		this.baseUrl = baseUrl;
	}

	async getMonitor(): Promise<GetMonitorOutput> {
		const response = await this.fetchJson('/api/monitor');
		return new GetMonitorOutput(response);
	}

	async getProjectList(): Promise<GetProjectListOutput> {
		const response = await this.fetchJson('/api/projects');
		return new GetProjectListOutput(response);
	}

	async getProject(projectId: string): Promise<GetProjectOutput> {
		const response = await this.fetchJson(`/api/projects/${projectId}`);
		return new GetProjectOutput(response);
	}

	async getAgentList(): Promise<GetAgentListOutput> {
		const response = await this.fetchJson('/api/agents');
		return new GetAgentListOutput(response);
	}

	async getAgent(agentId: string): Promise<GetAgentOutput> {
		const response = await this.fetchJson(`/api/agents/${agentId}`);
		return new GetAgentOutput(response);
	}

	async getProcessList(agentId: string): Promise<GetProcessListOutput> {
		const response = await this.fetchJson(`/api/agents/${agentId}/processes`);
		return new GetProcessListOutput(response);
	}

	async getProcess(agentId: string, processRunId: string): Promise<GetProcessOutput> {
		const response = await this.fetchJson(`/api/agents/${agentId}/processes/${processRunId}`);
		return new GetProcessOutput(response);
	}

	async getProcessLog(agentId: string, processRunId: string): Promise<GetProcessLogOutput> {
		const response = await this.fetchJson(`/api/agents/${agentId}/processes/${processRunId}/log`);
		return new GetProcessLogOutput(response);
	}

	private async fetchJson(path: string): Promise<unknown> {
		const requestUrl = `${this.baseUrl}${path}`;
		const response = await fetch(requestUrl);

		if (!response.ok) {
			throw new Error(`monitor request failed: ${response.status} ${requestUrl}`);
		}

		return await response.json();
	}
}

export const monitorApiClient = new MonitorApiClient();
