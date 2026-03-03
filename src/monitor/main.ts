import { bootstrapMonitor } from '#src/monitor/boot/bootstrap-monitor';
import {
	handleMonitorServe,
	handleMonitorStart,
	handleMonitorStatus,
	handleMonitorStop,
} from '#src/monitor/boot/monitor-commands';
import { getBuildVersion } from '#src/shared/build';

async function main(): Promise<void> {
	const version = getBuildVersion();
	const command = Bun.argv[2] ?? 'start';
	const args = Bun.argv.slice(3);
	const devMode = args.includes('--dev');
	const runtime = await bootstrapMonitor();

	switch (command) {
		case 'serve': {
			await handleMonitorServe(runtime, version);
			return;
		}
		case 'status': {
			await handleMonitorStatus(runtime);
			return;
		}
		case 'stop': {
			await handleMonitorStop(runtime);
			return;
		}
		default: {
			await handleMonitorStart(runtime, version, devMode);
			return;
		}
	}
}

void main();
