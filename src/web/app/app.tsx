import { Route, Router, useParams } from '@solidjs/router';
import { AppShell } from '#src/web/app/app-shell';
import { AgentDetailRoute } from '#src/web/routes/agents/agent-detail-route';
import { AgentsRoute } from '#src/web/routes/agents/agents-route';
import { OverviewRoute } from '#src/web/routes/overview/overview-route';
import { ProjectDetailRoute } from '#src/web/routes/projects/project-detail-route';
import { ProjectsRoute } from '#src/web/routes/projects/projects-route';
import '#src/web/styles/gl-base.css';

export function App() {
	return (
		<Router root={AppShell}>
			<Route path="/" component={() => <OverviewRoute />} />
			<Route path="/projects" component={() => <ProjectsRoute />} />
			<Route path="/projects/:projectId" component={ProjectDetailRoutePage} />
			<Route path="/agents" component={() => <AgentsRoute />} />
			<Route path="/agents/:agentId" component={AgentDetailRoutePage} />
		</Router>
	);
}

function ProjectDetailRoutePage() {
	const params = useParams<{ projectId: string }>();

	return <ProjectDetailRoute projectId={params.projectId} />;
}

function AgentDetailRoutePage() {
	const params = useParams<{ agentId: string }>();

	return <AgentDetailRoute agentId={params.agentId} />;
}
