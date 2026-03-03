import { Hono, type Context } from 'hono';
import { ZodError } from 'zod';

export function createApiApp(serviceName: string): Hono {
	const app = new Hono();

	app.get('/health', (context) => {
		return context.json({
			name: serviceName,
			status: 'running',
		});
	});

	app.onError((error, context) => {
		if (error instanceof ZodError) {
			return context.json(
				{
					error: 'invalid request',
					issues: error.issues,
				},
				400,
			);
		}

		return context.json(
			{
				error: 'request failed',
			},
			500,
		);
	});

	app.notFound((context) => {
		const requestUrl = new URL(context.req.url);

		return context.json(
			{
				error: 'route not found',
				path: requestUrl.pathname,
			},
			404,
		);
	});

	return app;
}

export function okJson(context: Context, body: unknown): Response {
	return context.json(body);
}

export function notFoundJson(context: Context, error: string, extra?: Record<string, unknown>): Response {
	const body = {
		error,
		...extra,
	};

	return context.json(body, 404);
}
