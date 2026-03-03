import { A } from '@solidjs/router';
import type { JSX } from 'solid-js';
import '#src/web/app/app-shell.css';

interface AppShellProps {
	children?: JSX.Element;
}

export function AppShell(props: AppShellProps): JSX.Element {
	return (
		<div class="gl-app-shell">
			<aside class="gl-app-shell_sidebar">
				<div class="gl-app-shell_brand">
					<span class="gl-app-shell_name">GLITCH</span>
					<span class="gl-app-shell_tag">monitor</span>
				</div>
				<nav class="gl-app-shell_nav">
					<A class="gl-app-shell_link" href="/">
						overview
					</A>
					<A class="gl-app-shell_link" href="/projects">
						projects
					</A>
					<A class="gl-app-shell_link" href="/agents">
						agents
					</A>
				</nav>
			</aside>
			<main class="gl-app-shell_content">{props.children}</main>
		</div>
	);
}
