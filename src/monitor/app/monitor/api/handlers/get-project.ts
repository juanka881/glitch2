import type { Context } from 'hono';
import {
	AgentRecord,
	GetProjectInput,
	GetProjectOutput,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getProject(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const params = context.req.param();
	const input = new GetProjectInput({
		project_id: params.project_id,
	});

	const details = deps.query.getProject(input.project_id);

	if (!details) {
		return notFoundJson(context, 'project not found');
	}

	const latestAgent = details.latestAgent ? new AgentRecord(details.latestAgent) : null;
	const agents = details.agents.map((agent) => new AgentRecord(agent));
	const output = new GetProjectOutput({
		project: new ProjectRecord(details.project),
		latest_agent: latestAgent,
		agents,
	});

	return okJson(context, output);
}
