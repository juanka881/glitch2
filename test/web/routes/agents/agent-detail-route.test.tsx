import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expect, test } from 'vitest';
import { AgentRunStatus, ProcessStatus } from '#src/agent/app/supervisor/supervisor-shapes';
import { GetAgentOutput, GetProcessListOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';
import { createMonitorApiClientMock, createMonitorEventSourceMock } from '#test/web/mocks/monitor-mocks';
import { AgentDetailRoute } from '#src/web/routes/agents/agent-detail-route';

test('AgentDetailRoute renders', async () => {
	const monitorEventSource = createMonitorEventSourceMock();
	const monitorApiClient = createMonitorApiClientMock();

	monitorApiClient.getAgent.mockResolvedValue(
		new GetAgentOutput({
			agent: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f80',
				project_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f81',
				cwd: 'C:/work/glitch2',
				pid: 1,
				start_date: '2026-03-03T00:00:00.000Z',
				end_date: null,
				ping_date: '2026-03-03T00:00:00.000Z',
				base_url: 'http://127.0.0.1:19001',
				status: RegistryAgentStatus.Running,
				error: null,
			},
			project: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f81',
				name: 'glitch2',
				cwd: 'C:/work/glitch2',
				add_date: '2026-03-03T00:00:00.000Z',
				last_ping_date: '2026-03-03T00:00:00.000Z',
				latest_agent_id: null,
			},
		}),
	);
	monitorApiClient.getProcessLog.mockResolvedValue({
		lines: [],
	});
	monitorApiClient.getProcessList.mockResolvedValue(
		new GetProcessListOutput({
			agent: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f80',
				project_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f81',
				cwd: 'C:/work/glitch2',
				pid: 1,
				start_date: '2026-03-03T00:00:00.000Z',
				end_date: null,
				ping_date: '2026-03-03T00:00:00.000Z',
				base_url: 'http://127.0.0.1:19001',
				status: RegistryAgentStatus.Running,
				error: null,
			},
			project: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f81',
				name: 'glitch2',
				cwd: 'C:/work/glitch2',
				add_date: '2026-03-03T00:00:00.000Z',
				last_ping_date: '2026-03-03T00:00:00.000Z',
				latest_agent_id: null,
			},
			agent_run: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f80',
				project_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f81',
				project_name: 'glitch2',
				cwd: 'C:/work/glitch2',
				start_date: '2026-03-03T00:00:00.000Z',
				end_date: null,
				agent_version: '0.1.0',
				status: AgentRunStatus.Running,
				error: null,
			},
			processes: [
				{
					id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f82',
					agent_run_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f80',
					process_id: 'web',
					command: 'bun run dev',
					cwd: 'C:/work/glitch2',
					pid: 10,
					start_date: '2026-03-03T00:00:00.000Z',
					end_date: null,
					exit_code: null,
					signal: null,
					status: ProcessStatus.Running,
				},
			],
		}),
	);

	render(() => (
		<MemoryRouter>
			<Route
				path="/"
				component={() => (
					<AgentDetailRoute
						agentId="018f433e-e4f9-7e6e-a87f-0f5cfe8f0f80"
						monitorEventSource={monitorEventSource}
						monitorApiClient={monitorApiClient}
					/>
				)}
			/>
		</MemoryRouter>
	));

	expect(screen.getByText('Loading agent detail')).toBeDefined();
});
