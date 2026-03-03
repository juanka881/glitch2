import type { Context } from 'hono';
import {
	AgentRecord,
	AgentRunRecord,
	GetProcessInput,
	GetProcessOutput,
	ProcessRecord,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getProcess(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const params = context.req.param();
	const input = new GetProcessInput({
		agent_id: params.agent_id,
		process_run_id: params.process_run_id,
	});

	const details = await deps.query.getProcess(input.agent_id, input.process_run_id);

	if (!details) {
		return notFoundJson(context, 'process not found');
	}

	const output = new GetProcessOutput({
		agent: new AgentRecord(details.agent),
		project: new ProjectRecord(details.project),
		agent_run: new AgentRunRecord(details.agentRun),
		process: new ProcessRecord(details.process),
	});

	return okJson(context, output);
}
