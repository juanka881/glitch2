import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { ProcessStream } from '#src/agent/app/supervisor/supervisor-shapes';
import { GlLogStream } from '#src/web/components/gl-log-stream';

test('GlLogStream renders', async () => {
	render(() => (
		<GlLogStream
			lines={[
				{
					agent_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f50',
					process_id: 'web',
					process_run_id: '018f433e-e4f9-7e6e-a87f-0f5cfe8f0f51',
					capture_date: '2026-03-03T00:00:00.000Z',
					stream: ProcessStream.Stdout,
					line: 'listening',
				},
			]}
		/>
	));
	
	expect(screen.getByText('listening')).toBeDefined();
});
