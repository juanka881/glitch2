import { A } from '@solidjs/router';
import { Show, createEffect, createMemo, createResource, createSignal, onCleanup, type JSX } from 'solid-js';
import type { StreamClearEvent, StreamLineEvent, StreamSnapshotEvent } from '#src/shared/events/monitor-event-shapes';
import { getProcessStreamRoomName } from '#src/shared/events/monitor-event-shapes';
import { type ProcessRecord, StreamLineRecordOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { GlButton } from '#src/web/components/gl-button';
import { GlDataGrid, type GlDataGridColumn } from '#src/web/components/gl-data-grid';
import { GlEmptyState } from '#src/web/components/gl-empty-state';
import { GlFieldRow } from '#src/web/components/gl-field-row';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';
import { GlLogStream } from '#src/web/components/gl-log-stream';
import { GlPanel } from '#src/web/components/gl-panel';
import { GlSplitLayout, GlSplitLayoutPane } from '#src/web/components/gl-split-layout';
import { GlStatusPill } from '#src/web/components/gl-status-pill';
import { monitorApiClient, type MonitorApiClientLike } from '#src/web/lib/monitor-api-client';
import { monitorEventSource, type MonitorEventSource } from '#src/web/lib/monitor-event-source';
import '#src/web/routes/agents/agent-detail-route.css';

interface AgentDetailRouteProps {
	agentId?: string;
	monitorApiClient?: MonitorApiClientLike;
	monitorEventSource?: MonitorEventSource;
}

export function AgentDetailRoute(props: AgentDetailRouteProps): JSX.Element {
	const apiClient = props.monitorApiClient ?? monitorApiClient;
	const eventSource = props.monitorEventSource ?? monitorEventSource;
	const agentId = props.agentId ?? '';
	const [agent] = createResource(() => apiClient.getAgent(agentId));
	const [processList] = createResource(() => apiClient.getProcessList(agentId));
	const [selectedProcessRunId, setSelectedProcessRunId] = createSignal<string>();
	const [lines, setLines] = createSignal<StreamLineRecordOutput[]>([]);

	const selectedProcess = createMemo(() => {
		const currentProcessList = processList();
		const currentSelectedProcessRunId = selectedProcessRunId();

		if (!currentProcessList) {
			return undefined;
		}

		if (!currentSelectedProcessRunId) {
			return currentProcessList.processes[0];
		}

		return (
			currentProcessList.processes.find((process) => process.id === currentSelectedProcessRunId) ??
			currentProcessList.processes[0]
		);
	});

	const [processLog] = createResource(
		() => {
			const process = selectedProcess();
			return process ? `${agentId}:${process.id}` : undefined;
		},
		async () => {
			const process = selectedProcess();

			if (!process) {
				return undefined;
			}

			return await apiClient.getProcessLog(agentId, process.id);
		},
	);

	const columns: GlDataGridColumn<ProcessRecord>[] = [
		{
			key: 'process_id',
			label: 'process',
			render(process) {
				return (
					<button
						class="gl-agent-detail-route_process-link"
						onClick={() => setSelectedProcessRunId(process.id)}
						type="button"
					>
						{process.process_id}
					</button>
				);
			},
		},
		{
			key: 'status',
			label: 'status',
			render(process) {
				return <GlStatusPill label={process.status} tone={getProcessTone(process.status)} />;
			},
		},
		{
			key: 'command',
			label: 'command',
			render(process) {
				return <span>{process.command}</span>;
			},
		},
	];

	createEffect(() => {
		const currentProcessList = processList();
		const firstProcess = currentProcessList?.processes[0];

		if (!firstProcess) {
			return;
		}

		setSelectedProcessRunId((currentSelectedProcessRunId) => currentSelectedProcessRunId ?? firstProcess.id);
	});

	createEffect(() => {
		const currentProcessLog = processLog();

		if (!currentProcessLog) {
			setLines([]);
			return;
		}

		const nextLines = currentProcessLog.lines.map((line) => new StreamLineRecordOutput(line));
		setLines(nextLines);
	});

	createEffect(() => {
		const process = selectedProcess();

		if (!process) {
			return;
		}

		const roomName = getProcessStreamRoomName(agentId, process.process_id);
		const handleSnapshot = (event: StreamSnapshotEvent) => {
			if (event.body.room !== roomName) {
				return;
			}

			const nextLines = event.body.lines.map((line) => new StreamLineRecordOutput(line));
			setLines(nextLines);
		};
		const handleLine = (event: StreamLineEvent) => {
			if (event.body.room !== roomName) {
				return;
			}

			const nextLine = new StreamLineRecordOutput(event.body.line);

			setLines((currentLines) => {
				const nextLines = [...currentLines, nextLine];
				const overflowCount = nextLines.length - 100;

				if (overflowCount > 0) {
					nextLines.splice(0, overflowCount);
				}

				return nextLines;
			});
		};
		const handleClear = (event: StreamClearEvent) => {
			if (event.body.room !== roomName) {
				return;
			}

			setLines([]);
		};
		const offSnapshot = eventSource.onSnapshot(handleSnapshot);
		const offLine = eventSource.onLine(handleLine);
		const offClear = eventSource.onClear(handleClear);

		eventSource.subscribeToProcess(agentId, process.process_id);

		onCleanup(() => {
			eventSource.unsubscribeFromProcess(agentId, process.process_id);
			offSnapshot();
			offLine();
			offClear();
		});
	});

	return (
		<Show when={agent()} fallback={<GlLoadingBlock label="Loading agent detail" />}>
			{(currentAgent) => (
				<Show when={processList()} fallback={<GlLoadingBlock label="Loading process list" />}>
					{(currentProcessList) => (
						<GlSplitLayout>
							<GlSplitLayoutPane type="primary">
								<div class="gl-agent-detail-route_stack">
									<GlPanel kicker="agent" title={currentAgent().agent.id} tone="strong">
										<div class="gl-agent-detail-route_meta">
											<GlFieldRow label="status">
												<GlStatusPill
													label={currentAgent().agent.status}
													tone={getAgentTone(currentAgent().agent.status)}
												/>
											</GlFieldRow>
											<GlFieldRow label="project">
												<A href={`/projects/${currentAgent().agent.project_id}`}>
													{currentAgent().project?.name ?? currentAgent().agent.project_id}
												</A>
											</GlFieldRow>
											<GlFieldRow label="pid">{currentAgent().agent.pid}</GlFieldRow>
											<GlFieldRow label="base url">{currentAgent().agent.base_url}</GlFieldRow>
										</div>
									</GlPanel>
									<GlPanel kicker="stream" title="live process output">
										<Show
											when={selectedProcess()}
											fallback={
												<GlEmptyState title="No process selected" message="Select a process to inspect its stream." />
											}
										>
											{(process) => (
												<div class="gl-agent-detail-route_stream">
													<div class="gl-agent-detail-route_stream-toolbar">
														<GlStatusPill label={process().process_id} tone="running" />
														<GlButton onClick={() => setLines([])}>clear buffer</GlButton>
													</div>
													<GlLogStream lines={lines()} />
												</div>
											)}
										</Show>
									</GlPanel>
								</div>
							</GlSplitLayoutPane>
							<GlSplitLayoutPane type="secondary">
								<GlPanel kicker="processes" title="process runs">
									<Show
										when={currentProcessList().processes.length > 0}
										fallback={
											<GlEmptyState title="No processes" message="No process runs were found for this agent." />
										}
									>
										<GlDataGrid
											columns={columns}
											getRowKey={(process) => process.id}
											rows={currentProcessList().processes}
										/>
									</Show>
								</GlPanel>
							</GlSplitLayoutPane>
						</GlSplitLayout>
					)}
				</Show>
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

function getProcessTone(status: string): 'default' | 'running' | 'warning' | 'error' {
	switch (status) {
		case 'running':
			return 'running';
		case 'start':
			return 'warning';
		case 'fail':
			return 'error';
		default:
			return 'default';
	}
}
