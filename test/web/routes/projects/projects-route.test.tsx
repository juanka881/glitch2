import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expect, test } from 'vitest';
import { GetProjectListOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import { createMonitorApiClientMock } from '#test/web/mocks/monitor-mocks';
import { ProjectsRoute } from '#src/web/routes/projects/projects-route';

test('ProjectsRoute renders', async () => {
	const monitorApiClient = createMonitorApiClientMock();

	monitorApiClient.getProjectList.mockResolvedValue(
		new GetProjectListOutput({
			projects: [
				{
					id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f60',
					name: 'glitch2',
					cwd: 'C:/work/glitch2',
					add_date: '2026-03-03T00:00:00.000Z',
					last_ping_date: '2026-03-03T00:00:00.000Z',
					latest_agent_id: null,
				},
			],
		}),
	);

	render(() => (
		<MemoryRouter>
			<Route path='/' component={() => <ProjectsRoute monitorApiClient={monitorApiClient} />} />
		</MemoryRouter>
	));

	expect(screen.getByText('Loading projects')).toBeDefined();
});
