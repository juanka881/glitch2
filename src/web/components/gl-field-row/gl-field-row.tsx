import type { JSX } from 'solid-js';
import '#src/web/components/gl-field-row/gl-field-row.css';

export interface GlFieldRowProps {
	label: string;
	children: JSX.Element;
}

export function GlFieldRow(props: GlFieldRowProps): JSX.Element {
	return (
		<div class="gl-field-row">
			<span class="gl-field-row_label">{props.label}</span>
			<span class="gl-field-row_value">{props.children}</span>
		</div>
	);
}
