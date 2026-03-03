import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlSplitLayout, GlSplitLayoutPane } from '#src/web/components/gl-split-layout';

test('GlSplitLayout renders', async () => {
	render(() => (
		<GlSplitLayout>
			<GlSplitLayoutPane type="primary">left</GlSplitLayoutPane>
			<GlSplitLayoutPane type="secondary">right</GlSplitLayoutPane>
		</GlSplitLayout>
	));
	
	expect(screen.getByText('left')).toBeDefined();
});
