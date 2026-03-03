import { expect, test } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { GlButton } from '#src/web/components/gl-button';

test('GlButton renders', async () => {	
	render(() => <GlButton>launch</GlButton>);

	// expect(screen.getByText('launch')).toBeInTheDocument();
});
