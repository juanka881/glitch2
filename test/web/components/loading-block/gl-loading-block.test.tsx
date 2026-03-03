import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlLoadingBlock } from '#src/web/components/gl-loading-block';

test('GlLoadingBlock renders', async () => {
	render(() => <GlLoadingBlock label="Loading" />);

	expect(screen.getByText('Loading')).toBeDefined();
});
