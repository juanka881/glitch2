import { A } from '@solidjs/router';
import { Show, createResource, type JSX } from 'solid-js';
import { GlDataGrid, type GlDataGridColumn } from '#src/web/components/gl-data-grid';
import { GlEmptyState } from '#src/web/components/gl-empty-state';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';
import { GlPanel } from '#src/web/components/gl-panel';
import { GlSplitLayout, GlSplitLayoutPane } from '#src/web/components/gl-split-layout';
import { GlStatusPill } from '#src/web/components/gl-status-pill';
import { monitorApiClient, type MonitorApiClientLike } from '#src/web/lib/monitor-api-client';
import type {
	AgentRecord,
	GetAgentListOutput,
	GetMonitorOutput,
	GetProjectListOutput,
	ProjectRecord,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import '#src/web/routes/overview/overview-route.css';

interface OverviewRouteProps {
	monitorApiClient?: MonitorApiClientLike;
}

interface OverviewMonitorPanelProps {
	monitor: GetMonitorOutput;
}

interface OverviewProjectPanelProps {
	projects: GetProjectListOutput;
	columns: GlDataGridColumn<ProjectRecord>[];
}

interface OverviewAgentPanelProps {
	agents: GetAgentListOutput;
	columns: GlDataGridColumn<AgentRecord>[];
}

export function OverviewRoute(props: OverviewRouteProps): JSX.Element {
	const apiClient = props.monitorApiClient ?? monitorApiClient;
	const [monitor] = createResource(() => apiClient.getMonitor());
	const [projects] = createResource(() => apiClient.getProjectList());
	const [agents] = createResource(() => apiClient.getAgentList());

	const projectColumns: GlDataGridColumn<ProjectRecord>[] = [
		{
			key: 'name',
			label: 'project',
			render(project) {
				return <A href={`/projects/${project.id}`}>{project.name}</A>;
			},
		},
		{
			key: 'cwd',
			label: 'cwd',
			render(project) {
				return <span>{project.cwd}</span>;
			},
		},
	];
	const agentColumns: GlDataGridColumn<AgentRecord>[] = [
		{
			key: 'agent',
			label: 'agent',
			render(agent) {
				return <A href={`/agents/${agent.id}`}>{agent.id}</A>;
			},
		},
		{
			key: 'status',
			label: 'status',
			render(agent) {
				return <GlStatusPill label={agent.status} tone={getAgentTone(agent.status)} />;
			},
		},
	];

	return (
		<div class="gl-overview-route">
			<GlSplitLayout>
				<GlSplitLayoutPane type="primary">
					<div class="gl-overview-route_stack">
						<GlPanel kicker="monitor" title="system state" tone="strong">
							<Show when={monitor()} fallback={<GlLoadingBlock label="Loading monitor" />}>
								{(currentMonitor) => <OverviewMonitorPanel monitor={currentMonitor()} />}
							</Show>
						</GlPanel>
						<GlPanel kicker="projects" title="known projects">
							<Show when={projects()} fallback={<GlLoadingBlock label="Loading projects" />}>
								{(projectList) => <OverviewProjectPanel columns={projectColumns} projects={projectList()} />}
							</Show>
						</GlPanel>
					</div>
				</GlSplitLayoutPane>
				<GlSplitLayoutPane type="secondary">
					<GlPanel kicker="agents" title="recent agents">
						<Show when={agents()} fallback={<GlLoadingBlock label="Loading agents" />}>
							{(agentList) => <OverviewAgentPanel agents={agentList()} columns={agentColumns} />}
						</Show>
					</GlPanel>
				</GlSplitLayoutPane>
			</GlSplitLayout>
		</div>
	);
}

function OverviewMonitorPanel(props: OverviewMonitorPanelProps): JSX.Element {
	return (
		<div class="gl-overview-route_monitor">
			<GlStatusPill
				label={props.monitor.healthy ? 'healthy' : 'degraded'}
				tone={props.monitor.healthy ? 'running' : 'warning'}
			/>
			<div class="gl-overview-route_meta">
				<span>pid {props.monitor.pid}</span>
				<span>{props.monitor.base_url}</span>
				<span>version {props.monitor.version}</span>
			</div>
		</div>
	);
}

function OverviewProjectPanel(props: OverviewProjectPanelProps): JSX.Element {
	if (props.projects.projects.length === 0) {
		return <GlEmptyState title="No projects" message="Run glitch agent against a project to register it." />;
	}

	return <GlDataGrid columns={props.columns} getRowKey={(project) => project.id} rows={props.projects.projects} />;
}

function OverviewAgentPanel(props: OverviewAgentPanelProps): JSX.Element {
	if (props.agents.agents.length === 0) {
		return <GlEmptyState title="No agents" message="No active or historical agents were found." />;
	}

	const recentAgents = props.agents.agents.slice(-8).reverse();
	return <GlDataGrid columns={props.columns} getRowKey={(agent) => agent.id} rows={recentAgents} />;
}

function getAgentTone(status: string): 'default' | 'running' | 'warning' | 'error' {
	switch (status) {
		case 'running':
			return 'running';
		case 'start':
			return 'warning';
		case 'fail':
		case 'crash':
			return 'error';
		default:
			return 'default';
	}
}
