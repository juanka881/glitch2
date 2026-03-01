const categories = ['http', 'db', 'worker', 'cache', 'auth'];
const messages = [
	'request completed',
	'query finished',
	'job started',
	'cache refreshed',
	'user authenticated',
	'retrying operation',
	'background sync complete',
	'rate limit check passed',
];

const intervalMs = readNumberArg('--interval', 750);
const errorRate = readNumberArg('--error-rate', 0.2);
const maxLines = readNumberArg('--count', 0);

let lineCount = 0;
let timer: Timer | null = null;

function main() {
	writeLine(
		'info',
		'glitch',
		`random log generator started interval=${intervalMs}ms error_rate=${errorRate}`,
	);

	timer = setInterval(() => {
		lineCount += 1;

		const category = pick(categories);
		const message = pick(messages);
		const requestId = createRequestId();
		const durationMs = randomInt(5, 1200);
		const statusCode = randomInt(200, 599);
		const level =
			Math.random() < errorRate ? 'error' : pick(['info', 'debug', 'warn']);
		const line = `level=${level} category=${category} request_id=${requestId} status=${statusCode} duration_ms=${durationMs} msg="${message}"`;

		writeLine(level, category, line);

		if (maxLines > 0 && lineCount >= maxLines) {
			shutdown();
		}
	}, intervalMs);

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

function shutdown() {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}

	writeLine(
		'info',
		'glitch',
		`random log generator stopped lines=${lineCount}`,
	);
	process.exit(0);
}

function writeLine(level: string, category: string, line: string) {
	const prefix = `${new Date().toISOString()} ${category}`;
	const output = `${prefix} ${line}`;

	if (level === 'error') {
		process.stderr.write(`${output}\n`);
		return;
	}

	process.stdout.write(`${output}\n`);
}

function pick(values: string[]) {
	return values[randomInt(0, values.length - 1)]!;
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createRequestId() {
	return Math.random().toString(36).slice(2, 10);
}

function readNumberArg(flag: string, fallback: number) {
	const index = process.argv.indexOf(flag);

	if (index === -1) {
		return fallback;
	}

	const rawValue = process.argv[index + 1];
	const parsedValue = Number(rawValue);

	if (!Number.isFinite(parsedValue)) {
		return fallback;
	}

	return parsedValue;
}

main();
