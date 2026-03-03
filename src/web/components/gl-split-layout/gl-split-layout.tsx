import type { JSX } from 'solid-js';
import '#src/web/components/gl-split-layout/gl-split-layout.css';

export interface GlSplitLayoutProps {
	children: JSX.Element;
}

export interface GlSplitLayoutPaneProps {
	type: 'primary' | 'secondary';
	children: JSX.Element;
}

export function GlSplitLayout(props: GlSplitLayoutProps): JSX.Element {
	return <div class="gl-split-layout">{props.children}</div>;
}

export function GlSplitLayoutPane(props: GlSplitLayoutPaneProps): JSX.Element {
	return <div class={`gl-split-layout_pane type-${props.type}`}>{props.children}</div>;
}
