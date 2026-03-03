import type { JSX } from 'solid-js';
import '#src/web/components/gl-panel/gl-panel.css';

export interface GlPanelProps {
	title?: string;
	kicker?: string;
	children: JSX.Element;
	tone?: 'default' | 'strong';
}

export function GlPanel(props: GlPanelProps): JSX.Element {
	const toneClass = props.tone === 'strong' ? 'tone-strong' : 'tone-default';
	const showHeader = props.kicker || props.title;

	return (
		<section class={`gl-panel ${toneClass}`}>
			{showHeader && (
				<header class="gl-panel_header">
					{props.kicker && <span class="gl-panel_kicker">{props.kicker}</span>}
					{props.title && <h2 class="gl-panel_title">{props.title}</h2>}
				</header>
			)}
			<div class="gl-panel_body">{props.children}</div>
		</section>
	);
}
