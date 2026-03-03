import type { JSX } from 'solid-js';
import '#src/web/components/gl-button/gl-button.css';

export interface GlButtonProps {
	children: JSX.Element;
	onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
	type?: 'button' | 'submit' | 'reset';
	tone?: 'default' | 'accent';
	size?: 'normal' | 'large';
}

export function GlButton(props: GlButtonProps): JSX.Element {
	const toneClass = props.tone === 'accent' ? 'tone-accent' : 'tone-default';
	const sizeClass = props.size === 'large' ? 'size-large' : 'size-normal';
	const buttonType = props.type ?? 'button';

	return (
		<button class={`gl-button ${toneClass} ${sizeClass}`} onClick={props.onClick} type={buttonType}>
			{props.children}
		</button>
	);
}
