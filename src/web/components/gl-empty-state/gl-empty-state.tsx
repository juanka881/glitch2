import type { JSX } from 'solid-js';
import '#src/web/components/gl-empty-state/gl-empty-state.css';

export interface GlEmptyStateProps {
	title: string;
	message: string;
}

export function GlEmptyState(props: GlEmptyStateProps): JSX.Element {
	return (
		<div class="gl-empty-state">
			<strong class="gl-empty-state_title">{props.title}</strong>
			<p class="gl-empty-state_message">{props.message}</p>
		</div>
	);
}
