import type { Context } from 'hono';
import { AgentRecord, GetAgentListInput, GetAgentListOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { okJson } from '#src/shared/utils/http';

export async function getAgentList(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const input = new GetAgentListInput(context.req.query());
	void input;

	const agents = deps.query.getAgents();
	const agentRecords = agents.map((agent) => new AgentRecord(agent));
	const output = new GetAgentListOutput({
		agents: agentRecords,
	});

	return okJson(context, output);
}
