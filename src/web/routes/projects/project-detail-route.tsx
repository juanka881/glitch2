import { A } from '@solidjs/router';
import { For, Show, createResource, type JSX } from 'solid-js';
import { GlDataGrid, type GlDataGridColumn } from '#src/web/components/gl-data-grid';
import { GlEmptyState } from '#src/web/components/gl-empty-state';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';
import { GlPanel } from '#src/web/components/gl-panel';
import { GlSplitLayout, GlSplitLayoutPane } from '#src/web/components/gl-split-layout';
import { GlStatusPill } from '#src/web/components/gl-status-pill';
import { monitorApiClient, type MonitorApiClientLike } from '#src/web/lib/monitor-api-client';
import type { AgentRecord } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import '#src/web/routes/projects/project-detail-route.css';

interface ProjectDetailRouteProps {
	projectId?: string;
	monitorApiClient?: MonitorApiClientLike;
}

export function ProjectDetailRoute(props: ProjectDetailRouteProps): JSX.Element {
	const apiClient = props.monitorApiClient ?? monitorApiClient;
	const projectId = props.projectId ?? '';
	const [project] = createResource(() => apiClient.getProject(projectId));

	const columns: GlDataGridColumn<AgentRecord>[] = [
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
		{
			key: 'ping_date',
			label: 'last ping',
			render(agent) {
				return <span>{agent.ping_date}</span>;
			},
		},
	];

	return (
		<Show when={project()} fallback={<GlLoadingBlock label="Loading project" />}>
			{(projectOutput) => (
				<GlSplitLayout>
					<GlSplitLayoutPane type="primary">
						<GlPanel kicker="project" title={projectOutput().project.name} tone="strong">
							<div class="gl-project-detail-route_meta">
								<span>{projectOutput().project.cwd}</span>
								<span>added {projectOutput().project.add_date}</span>
								<span>ping {projectOutput().project.last_ping_date}</span>
							</div>
							<div class="gl-project-detail-route_agents">
								<Show
									when={projectOutput().agents.length > 0}
									fallback={<GlEmptyState title="No agents" message="This project has no agent history yet." />}
								>
									<GlDataGrid columns={columns} getRowKey={(agent) => agent.id} rows={projectOutput().agents} />
								</Show>
							</div>
						</GlPanel>
					</GlSplitLayoutPane>
					<GlSplitLayoutPane type="secondary">
						<GlPanel kicker="latest" title="latest agent">
							<Show
								when={projectOutput().latest_agent}
								fallback={
									<GlEmptyState
										title="No latest agent"
										message="No agent has reached running state for this project yet."
									/>
								}
							>
								{(latestAgent) => (
									<div class="gl-project-detail-route_latest">
										<GlStatusPill label={latestAgent().status} tone={getAgentTone(latestAgent().status)} />
										<For each={[latestAgent().id, latestAgent().base_url, latestAgent().ping_date]}>
											{(value) => <span>{value}</span>}
										</For>
									</div>
								)}
							</Show>
						</GlPanel>
					</GlSplitLayoutPane>
				</GlSplitLayout>
			)}
		</Show>
	);
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
