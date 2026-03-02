import { createServer } from 'node:net';

const MIN_PORT = 18000;
const MAX_PORT = 28000;
const MAX_ATTEMPTS = 18;

export async function reserveBaseUrl(): Promise<string> {
	const startPort = randomPort();

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
		const port = wrapPort(startPort + attempt);
		const available = await isPortAvailable(port);

		if (available) {
			return `http://127.0.0.1:${port}`;
		}
	}

	throw new Error('Failed to allocate base_url');
}

function randomPort(): number {
	const range = MAX_PORT - MIN_PORT + 1;
	return MIN_PORT + Math.floor(Math.random() * range);
}

function wrapPort(port: number): number {
	if (port <= MAX_PORT) {
		return port;
	}

	const offset = (port - MIN_PORT) % (MAX_PORT - MIN_PORT + 1);
	return MIN_PORT + offset;
}

async function isPortAvailable(port: number): Promise<boolean> {
	return await new Promise<boolean>((resolve) => {
		const server = createServer();

		server.once('error', () => {
			resolve(false);
		});

		server.listen(port, '127.0.0.1', () => {
			server.close(() => {
				resolve(true);
			});
		});
	});
}
