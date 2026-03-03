import { render } from 'solid-js/web';
import { App } from '#src/web/app/app';

const root = document.getElementById('root');

if (!root) {
	throw new Error('web root element not found');
}

render(App, root);
