import { A } from '@solidjs/router';
import { Show, createResource, type JSX } from 'solid-js';
import { GlDataGrid, type GlDataGridColumn } from '#src/web/components/gl-data-grid';
import { GlEmptyState } from '#src/web/components/gl-empty-state';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';
import { GlPanel } from '#src/web/components/gl-panel';
import { monitorApiClient, type MonitorApiClientLike } from '#src/web/lib/monitor-api-client';
import type { GetProjectListOutput, ProjectRecord } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import '#src/web/routes/projects/projects-route.css';

interface ProjectsRouteProps {
	monitorApiClient?: MonitorApiClientLike;
}

interface ProjectListPanelProps {
	projects: GetProjectListOutput;
	columns: GlDataGridColumn<ProjectRecord>[];
}

export function ProjectsRoute(props: ProjectsRouteProps): JSX.Element {
	const apiClient = props.monitorApiClient ?? monitorApiClient;
	const [projects] = createResource(() => apiClient.getProjectList());

	const columns: GlDataGridColumn<ProjectRecord>[] = [
		{
			key: 'name',
			label: 'project',
			render(project) {
				return <A href={`/projects/${project.id}`}>{project.name}</A>;
			},
		},
		{
			key: 'add_date',
			label: 'add date',
			render(project) {
				return <span>{project.add_date}</span>;
			},
		},
		{
			key: 'last_ping_date',
			label: 'last ping',
			render(project) {
				return <span>{project.last_ping_date}</span>;
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

	return (
		<GlPanel kicker="projects" title="registry projects" tone="strong">
			<Show when={projects()} fallback={<GlLoadingBlock label="Loading projects" />}>
				{(projectList) => <ProjectListPanel columns={columns} projects={projectList()} />}
			</Show>
		</GlPanel>
	);
}

function ProjectListPanel(props: ProjectListPanelProps): JSX.Element {
	if (props.projects.projects.length === 0) {
		return <GlEmptyState title="No projects" message="No projects are registered in the local registry." />;
	}

	return <GlDataGrid columns={props.columns} getRowKey={(project) => project.id} rows={props.projects.projects} />;
}
