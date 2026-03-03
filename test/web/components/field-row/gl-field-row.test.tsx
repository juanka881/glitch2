import { test } from 'vitest';
import { GlFieldRow } from '#src/web/components/gl-field-row';
import { render } from '@solidjs/testing-library';

test('GlFieldRow renders', async () => {
	render(() => GlFieldRow({ label: 'pid', children: '123' }));
});
