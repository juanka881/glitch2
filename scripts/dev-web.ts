import childProcess from 'node:child_process';
import path from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { DEV_MONITOR_BASE_URL } from '#src/shared/utils/base-url';
import { wait } from '#src/shared/utils/promise';

const MONITOR_STOP_WAIT_MS = 1_000;
const BUN_EXECUTABLE = process.execPath;
const MONITOR_COMMAND_ARGS = ['run', './src/monitor/main.ts', 'start', '--dev'];

interface ManagedProcess {
	child: childProcess.ChildProcess;
}

async function main(): Promise<void> {
	process.env.GLITCH_MONITOR_BASE_URL = DEV_MONITOR_BASE_URL;

	const monitor = startMonitorProcess();
	const vite = await createViteDevServer();
	const shutdown = createShutdown(monitor, vite);

	process.once('SIGINT', () => void shutdown(130));
	process.once('SIGTERM', () => void shutdown(143));

	if (process.platform === 'win32') {
		process.once('SIGBREAK', () => void shutdown(131));
	}

	const exitCode = await waitForExit(monitor);
	await shutdown(exitCode);
}

function startMonitorProcess(): ManagedProcess {
	const child = childProcess.spawn(BUN_EXECUTABLE, MONITOR_COMMAND_ARGS, {
		cwd: process.cwd(),
		env: process.env,
		stdio: 'inherit',
	});

	return {
		child,
	};
}

async function createViteDevServer(): Promise<ViteDevServer> {
	const configFile = path.resolve(process.cwd(), 'vite.config.js');
	const vite = await createServer({
		configFile,
	});

	await vite.listen();
	vite.printUrls();
	return vite;
}

function createShutdown(monitor: ManagedProcess, vite: ViteDevServer): (code: number) => Promise<void> {
	let shutdownPromise: Promise<void> | undefined;

	return async (code: number): Promise<void> => {
		if (shutdownPromise) {
			return shutdownPromise;
		}

		shutdownPromise = shutdownRuntime(monitor, vite, code);
		return shutdownPromise;
	};
}

async function shutdownRuntime(monitor: ManagedProcess, vite: ViteDevServer, code: number): Promise<void> {
	const shutdownSteps = [stopMonitorProcess(monitor), vite.close()];

	await Promise.allSettled(shutdownSteps);
	process.exit(code);
}

async function stopMonitorProcess(monitor: ManagedProcess): Promise<void> {
	const childPid = monitor.child.pid;

	if (!childPid || monitor.child.exitCode !== null || monitor.child.killed) {
		return;
	}

	monitor.child.kill('SIGINT');
	await wait(MONITOR_STOP_WAIT_MS);

	if (monitor.child.exitCode !== null || monitor.child.killed) {
		return;
	}

	if (process.platform === 'win32') {
		childProcess.spawnSync('taskkill', ['/pid', String(childPid), '/f'], {
			stdio: 'ignore',
		});
		return;
	}

	monitor.child.kill('SIGKILL');
}

async function waitForExit(monitor: ManagedProcess): Promise<number> {
	return await new Promise<number>((resolve) => {
		monitor.child.once('exit', (code, signal) => {
			if (typeof code === 'number') {
				resolve(code);
				return;
			}

			if (signal === 'SIGINT') {
				resolve(130);
				return;
			}

			if (signal === 'SIGTERM') {
				resolve(143);
				return;
			}

			if (signal === 'SIGBREAK') {
				resolve(131);
				return;
			}

			resolve(1);
		});
	});
}

void main();
