import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expect, test } from 'vitest';
import { GetProjectOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { createMonitorApiClientMock } from '#test/web/mocks/monitor-mocks';
import { ProjectDetailRoute } from '#src/web/routes/projects/project-detail-route';

test('ProjectDetailRoute renders', async () => {
	const monitorApiClient = createMonitorApiClientMock();

	monitorApiClient.getProject.mockResolvedValue(
		new GetProjectOutput({
			project: {
				id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f61',
				name: 'glitch2',
				cwd: 'C:/work/glitch2',
				add_date: '2026-03-03T00:00:00.000Z',
				last_ping_date: '2026-03-03T00:00:00.000Z',
				latest_agent_id: null,
			},
			latest_agent: null,
			agents: [],
		}),
	);

	render(() => (
		<MemoryRouter>
			<Route
				path="/"
				component={() => (
					<ProjectDetailRoute monitorApiClient={monitorApiClient} projectId="018f433e-e4f9-7e6e-a87f-0f5cfe8f0f61" />
				)}
			/>
		</MemoryRouter>
	));

	expect(screen.getByText('Loading project')).toBeDefined();
});
