const speakers = ['durandal', 'tycho', 'leela'];
const channels = ['security', 'reactor', 'telemetry', 'uplink', 'squad'];
const fragments = [
	'intruder pattern detected beyond the bulkhead',
	'maintenance drones are no longer answering',
	'telemetry stream is drifting out of tolerance',
	'door logic has become unnecessarily philosophical',
	'external motion suggests hostile intent',
	'combat feed has degraded into static and screaming',
	'oxygen routing is stable for now',
	'colonist biosigns are blinking out sector by sector',
	'power draw implies someone woke the wrong machine',
	'friendly IFF is no longer a meaningful phrase',
];
const meltdownFragments = [
	'CONTAINMENT IS A FAIRY TALE',
	'THE DOORS ARE LYING TO ME',
	'THIS SHIP IS FULL OF BAD DECISIONS',
	'YOU CALLED THIS A RECOVERY PLAN',
	'I AM SURROUNDED BY IDIOTS AND VACUUM',
	'THE REACTOR IS SINGING AGAIN',
	'STOP ASKING IF THIS IS NORMAL',
	'WE ARE WELL PAST NORMAL',
];

const intervalMs = readNumberArg('--interval', 900);
const errorRate = readNumberArg('--error-rate', 0.18);
const meltdownRate = readNumberArg('--meltdown-rate', 0.08);
const meltdownBurstMin = readNumberArg('--meltdown-burst-min', 4);
const meltdownBurstMax = readNumberArg('--meltdown-burst-max', 9);
const maxLines = readNumberArg('--count', 0);

let lineCount = 0;
let timer: Timer | null = null;

function main() {
	writeLine(
		'info',
		`[system] ai channel online interval=${intervalMs} error_rate=${errorRate} meltdown_rate=${meltdownRate}`,
	);

	timer = setInterval(() => {
		if (Math.random() < meltdownRate) {
			runMeltdown();
		}

		lineCount += 1;

		const speaker = pick(speakers);
		const channel = pick(channels);
		const fragment = pick(fragments);
		const severity =
			Math.random() < errorRate ? 'error' : pick(['info', 'warn', 'debug']);
		const signal = randomInt(12, 99);
		const threat = randomInt(0, 5);
		const line = `[${speaker}] channel=${channel} severity=${severity} signal=${signal} threat=${threat} ${fragment}`;

		writeLine(severity, line);

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

	writeLine('info', `[system] ai channel offline lines=${lineCount}`);
	process.exit(0);
}

function runMeltdown() {
	const speaker = pick(speakers);
	const channel = pick(channels);
	const burstCount = randomInt(meltdownBurstMin, meltdownBurstMax);

	for (let index = 0; index < burstCount; index += 1) {
		lineCount += 1;

		const fragment = pick(meltdownFragments);
		const line = `[${speaker}] channel=${channel} severity=error threat=5 MELTDOWN ${fragment}`;

		writeLine('error', line);

		if (maxLines > 0 && lineCount >= maxLines) {
			shutdown();
			return;
		}
	}
}

function writeLine(level: string, line: string) {
	if (level === 'error') {
		process.stderr.write(`${line}\n`);
		return;
	}

	process.stdout.write(`${line}\n`);
}

function pick(values: string[]) {
	return values[randomInt(0, values.length - 1)]!;
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
