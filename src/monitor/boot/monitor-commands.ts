import util from 'node:util';
import type { BootstrapMonitorRuntime } from '#src/monitor/boot/bootstrap-monitor';
import { DEV_MONITOR_BASE_URL } from '#src/shared/utils/base-url';

export async function handleMonitorStart(
	runtime: BootstrapMonitorRuntime,
	version: string,
	devMode: boolean,
): Promise<void> {
	if (devMode) {
		console.log(`glitch monitor ${util.styleText('green', 'dev')}`);
		console.log(`  url ${DEV_MONITOR_BASE_URL}`);
		await runtime.monitor.serveDev(version, runtime.query);
		return;
	}

	const status = await runtime.monitor.getStatus();

	if (status) {
		runtime.monitor.openBrowser(status.base_url);
		printRunningStatus(status.pid, status.base_url, status.healthy);
		return;
	}

	const monitorLock = await runtime.monitor.start();

	if (!monitorLock) {
		console.log('glitch monitor start requested');
		return;
	}

	runtime.monitor.openBrowser(monitorLock.base_url);
	console.log(`glitch monitor ${util.styleText('green', 'starting')}`);
	console.log(`  pid ${monitorLock.pid}`);
	console.log(`  url ${monitorLock.base_url}`);
}

export async function handleMonitorStatus(runtime: BootstrapMonitorRuntime): Promise<void> {
	const status = await runtime.monitor.getStatus();

	if (!status) {
		console.log('glitch monitor not running');
		return;
	}

	printRunningStatus(status.pid, status.base_url, status.healthy);
}

export async function handleMonitorStop(runtime: BootstrapMonitorRuntime): Promise<void> {
	const stopped = await runtime.monitor.stop();

	if (!stopped) {
		console.log('glitch monitor not running');
		return;
	}

	console.log('glitch monitor shutdown');
}

export async function handleMonitorServe(runtime: BootstrapMonitorRuntime, version: string): Promise<void> {
	await runtime.monitor.serve(version, runtime.query);
}

function printRunningStatus(pid: number, baseUrl: string, healthy: boolean): void {
	console.log(`glitch monitor ${util.styleText('green', 'running')}`);
	console.log(`  pid ${pid}`);
	console.log(`  url ${baseUrl}`);
	console.log(`  healthy ${healthy ? 'yes' : 'no'}`);
}
