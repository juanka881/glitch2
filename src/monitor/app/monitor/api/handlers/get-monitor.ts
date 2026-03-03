import type { Context } from 'hono';
import { GetMonitorInput, GetMonitorOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { notFoundJson, okJson } from '#src/shared/utils/http';

export async function getMonitor(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	new GetMonitorInput({});

	const status = await deps.query.getMonitorStatus();

	if (!status) {
		return notFoundJson(context, 'monitor not running');
	}

	const output = new GetMonitorOutput(status);
	return okJson(context, output);
}
