import type { Context } from 'hono';
import {
	AgentRecord,
	AgentRunRecord,
	GetProcessListInput,
	GetProcessListOutput,
	ProcessRecord,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getProcessList(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const params = context.req.param();
	const input = new GetProcessListInput({
		agent_id: params.agent_id,
	});

	const details = await deps.query.getProcesses(input.agent_id);

	if (!details) {
		return notFoundJson(context, 'process list not found');
	}

	const processRecords = details.processes.map((process) => new ProcessRecord(process));
	const output = new GetProcessListOutput({
		agent: new AgentRecord(details.agent),
		project: new ProjectRecord(details.project),
		agent_run: new AgentRunRecord(details.agentRun),
		processes: processRecords,
	});

	return okJson(context, output);
}
