import util from 'node:util';
import { bootstrapMonitor } from '#src/monitor/boot/bootstrap-monitor';
import { getBuildVersion } from '#src/shared/build';

async function main() {
	const version = getBuildVersion();
	const runtime = await bootstrapMonitor();
	const command = Bun.argv[2] ?? 'start';

	if (command === 'serve') {
		console.log(`glitch monitor ${version}`);
		await runtime.monitor.serve(version);
		return;
	}

	if (command === 'status') {
		const status = await runtime.monitor.getStatus();

		if (!status) {
			console.log('glitch monitor not running');
			runtime.registryDb.close();
			return;
		}

		console.log(`glitch monitor ${util.styleText('green', 'running')}`);
		console.log(`  pid ${status.pid}`);
		console.log(`  url ${status.base_url}`);
		runtime.registryDb.close();
		return;
	}

	if (command === 'stop') {
		const stopped = await runtime.monitor.stop();
		console.log(stopped ? 'glitch monitor stopping' : 'glitch monitor not running');
		runtime.registryDb.close();
		return;
	}

	const status = await runtime.monitor.ensureRunning();

	if (!status) {
		runtime.registryDb.close();
		throw new Error('Failed to start glitch monitor');
	}

	console.log(`glitch monitor ${util.styleText('green', 'ready')}`);
	console.log(`  pid ${status.pid}`);
	console.log(`  url ${status.base_url}`);
	runtime.registryDb.close();
}

void main();
