import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlPanel } from '#src/web/components/gl-panel';

test('GlPanel renders', async () => {
	render(() => <GlPanel title="status">ok</GlPanel>);

	expect(screen.getByText('status')).toBeDefined();
});
