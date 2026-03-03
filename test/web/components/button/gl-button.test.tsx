import { test } from 'vitest';
import { render } from '@solidjs/testing-library';
import { GlButton } from '#src/web/components/gl-button';

test('GlButton renders', async () => {
	render(() => <GlButton>launch</GlButton>);
});
