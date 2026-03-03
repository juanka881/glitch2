import type { JSX } from 'solid-js';
import '#src/web/components/gl-loading-block/gl-loading-block.css';

export interface GlLoadingBlockProps {
	label?: string;
}

export function GlLoadingBlock(props: GlLoadingBlockProps): JSX.Element {
	const label = props.label ?? 'Loading';

	return (
		<div class="gl-loading-block">
			<span class="gl-loading-block_bar" />
			<span class="gl-loading-block_label">{label}</span>
		</div>
	);
}
