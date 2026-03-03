import type { Context } from 'hono';
import { GetProcessLogInput, GetProcessLogOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getProcessLog(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const params = context.req.param();
	const input = new GetProcessLogInput({
		agent_id: params.agent_id,
		process_run_id: params.process_run_id,
	});
	const details = await deps.query.getProcess(input.agent_id, input.process_run_id);

	if (!details) {
		return notFoundJson(context, 'process log not found');
	}

	const lines = deps.stream.getLines(details.agent.id, details.process.process_id);
	const output = new GetProcessLogOutput({
		lines,
	});

	return okJson(context, output);
}
