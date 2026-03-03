import { A } from '@solidjs/router';
import { Show, createResource, type JSX } from 'solid-js';
import { GlDataGrid, type GlDataGridColumn } from '#src/web/components/gl-data-grid';
import { GlEmptyState } from '#src/web/components/gl-empty-state';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';
import { GlPanel } from '#src/web/components/gl-panel';
import { GlStatusPill } from '#src/web/components/gl-status-pill';
import { monitorApiClient, type MonitorApiClientLike } from '#src/web/lib/monitor-api-client';
import type { AgentRecord, GetAgentListOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';

interface AgentsRouteProps {
	monitorApiClient?: MonitorApiClientLike;
}

interface AgentListPanelProps {
	agents: GetAgentListOutput;
	columns: GlDataGridColumn<AgentRecord>[];
}

export function AgentsRoute(props: AgentsRouteProps): JSX.Element {
	const apiClient = props.monitorApiClient ?? monitorApiClient;
	const [agents] = createResource(() => apiClient.getAgentList());

	const columns: GlDataGridColumn<AgentRecord>[] = [
		{
			key: 'agent',
			label: 'agent',
			render(agent) {
				return <A href={`/agents/${agent.id}`}>{agent.id}</A>;
			},
		},
		{
			key: 'project',
			label: 'project',
			render(agent) {
				return <span>{agent.project_id}</span>;
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
			key: 'base_url',
			label: 'base url',
			render(agent) {
				return <span>{agent.base_url}</span>;
			},
		},
	];

	return (
		<GlPanel kicker="agents" title="agent history" tone="strong">
			<Show when={agents()} fallback={<GlLoadingBlock label="Loading agents" />}>
				{(agentList) => <AgentListPanel agents={agentList()} columns={columns} />}
			</Show>
		</GlPanel>
	);
}

function AgentListPanel(props: AgentListPanelProps): JSX.Element {
	if (props.agents.agents.length === 0) {
		return <GlEmptyState title="No agents" message="No agents are registered yet." />;
	}

	return <GlDataGrid columns={props.columns} getRowKey={(agent) => agent.id} rows={props.agents.agents} />;
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
