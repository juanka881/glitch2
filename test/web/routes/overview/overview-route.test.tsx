import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expect, test } from 'vitest';
import {
	GetAgentListOutput,
	GetMonitorOutput,
	GetProjectListOutput,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { createMonitorApiClientMock } from '#test/web/mocks/monitor-mocks';
import { OverviewRoute } from '#src/web/routes/overview/overview-route';

test('OverviewRoute renders', async () => {
	const monitorApiClient = createMonitorApiClientMock();

	monitorApiClient.getMonitor.mockResolvedValue(
		new GetMonitorOutput({
			pid: 1,
			start_date: '2026-03-03T00:00:00.000Z',
			base_url: 'http://127.0.0.1:19001',
			version: '0.1.0',
			healthy: true,
		}),
	);
	monitorApiClient.getProjectList.mockResolvedValue(
		new GetProjectListOutput({
			projects: [],
		}),
	);
	monitorApiClient.getAgentList.mockResolvedValue(
		new GetAgentListOutput({
			agents: [],
		}),
	);

	render(() => (
		<MemoryRouter>
			<Route path='/' component={() => <OverviewRoute monitorApiClient={monitorApiClient} />} />
		</MemoryRouter>
	));

	expect(screen.getByText('Loading monitor')).toBeDefined();
});
