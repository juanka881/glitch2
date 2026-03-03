import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlStatusPill } from '#src/web/components/gl-status-pill';

test('GlStatusPill renders', async () => {
	render(() => <GlStatusPill label="running" tone="running" />);
	
	expect(screen.getByText('running')).toBeDefined();
});
