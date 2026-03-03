import type { JSX } from 'solid-js';
import '#src/web/components/gl-status-pill/gl-status-pill.css';

export interface GlStatusPillProps {
	label: string;
	tone?: 'default' | 'running' | 'warning' | 'error';
}

export function GlStatusPill(props: GlStatusPillProps): JSX.Element {
	const toneClass = props.tone ? `tone-${props.tone}` : 'tone-default';

	return <span class={`gl-status-pill ${toneClass}`}>{props.label}</span>;
}
