import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expect, test } from 'vitest';
import { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';
import { GetAgentListOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { createMonitorApiClientMock } from '#test/web/mocks/monitor-mocks';
import { AgentsRoute } from '#src/web/routes/agents/agents-route';

test('AgentsRoute renders', async () => {
	const monitorApiClient = createMonitorApiClientMock();

	monitorApiClient.getAgentList.mockResolvedValue(
		new GetAgentListOutput({
			agents: [
				{
					id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f70',
					project_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f71',
					cwd: 'C:/work/glitch2',
					pid: 1,
					start_date: '2026-03-03T00:00:00.000Z',
					end_date: null,
					ping_date: '2026-03-03T00:00:00.000Z',
					base_url: 'http://127.0.0.1:19001',
					status: RegistryAgentStatus.Running,
					error: null,
				},
			],
		}),
	);

	render(() => (
		<MemoryRouter>
			<Route path="/" component={() => <AgentsRoute monitorApiClient={monitorApiClient} />} />
		</MemoryRouter>
	));

	expect(screen.getByText('Loading agents')).toBeDefined();
});
