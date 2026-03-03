import type { Context } from 'hono';
import {
	GetProjectListInput,
	GetProjectListOutput,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorRouterDeps } from '#src/monitor/app/monitor/api/monitor-router';
import { okJson } from '#src/shared/utils/http';

export async function getProjectList(context: Context, deps: MonitorRouterDeps): Promise<Response> {
	const input = new GetProjectListInput(context.req.query());
	void input;

	const projects = deps.query.getProjects();
	const projectRecords = projects.map((project) => new ProjectRecord(project));
	const output = new GetProjectListOutput({
		projects: projectRecords,
	});

	return okJson(context, output);
}
