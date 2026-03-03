import type { Context } from 'hono';
import {
	AgentRecord,
	GetAgentInput,
	GetAgentOutput,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getAgent(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const params = context.req.param();
	const input = new GetAgentInput({
		agent_id: params.agent_id,
	});

	const details = deps.query.getAgent(input.agent_id);

	if (!details) {
		return notFoundJson(context, 'agent not found');
	}

	const project = details.project ? new ProjectRecord(details.project) : null;
	const output = new GetAgentOutput({
		agent: new AgentRecord(details.agent),
		project,
	});

	return okJson(context, output);
}
