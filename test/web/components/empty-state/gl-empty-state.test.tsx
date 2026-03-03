import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlEmptyState } from '#src/web/components/gl-empty-state';

test('GlEmptyState renders', async () => {
	render(() => <GlEmptyState message="nothing here" title="empty" />);
	
	expect(screen.getByText('empty')).toBeDefined();
});
