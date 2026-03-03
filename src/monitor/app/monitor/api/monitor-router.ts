import { Hono } from 'hono';
import { getAgent } from '#src/monitor/app/monitor/api/handlers/get-agent';
import { getAgentList } from '#src/monitor/app/monitor/api/handlers/get-agent-list';
import { getMonitor } from '#src/monitor/app/monitor/api/handlers/get-monitor';
import { getProcess } from '#src/monitor/app/monitor/api/handlers/get-process';
import { getProcessLog } from '#src/monitor/app/monitor/api/handlers/get-process-log';
import { getProcessList } from '#src/monitor/app/monitor/api/handlers/get-process-list';
import { getProject } from '#src/monitor/app/monitor/api/handlers/get-project';
import { getProjectList } from '#src/monitor/app/monitor/api/handlers/get-project-list';
import type { MonitorQueryService } from '#src/monitor/app/monitor/monitor-query-service';
import type { MonitorStreamService } from '#src/monitor/app/monitor/monitor-stream-service';

export interface MonitorRouterDeps {
	query: MonitorQueryService;
	stream: MonitorStreamService;
}

export function createMonitorRouter(deps: MonitorRouterDeps): Hono {
	const app = new Hono();

	app.get('/api/monitor', (context) => getMonitor(context, deps));
	app.get('/api/projects', (context) => getProjectList(context, deps));
	app.get('/api/projects/:project_id', (context) => getProject(context, deps));
	app.get('/api/agents', (context) => getAgentList(context, deps));
	app.get('/api/agents/:agent_id', (context) => getAgent(context, deps));
	app.get('/api/agents/:agent_id/processes', (context) => getProcessList(context, deps));
	app.get('/api/agents/:agent_id/processes/:process_run_id', (context) => getProcess(context, deps));
	app.get('/api/agents/:agent_id/processes/:process_run_id/log', (context) => getProcessLog(context, deps));

	return app;
}
