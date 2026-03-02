import childProcess from 'node:child_process';

export interface MonitorProcessManager {
	isAlive(pid: number): boolean;
	openBrowser(url: string): void;
	startBackgroundServe(): void;
	stop(pid: number): void;
	forceStop(pid: number): void;
}

export class NodeMonitorProcessManager implements MonitorProcessManager {
	isAlive(pid: number): boolean {
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	}

	openBrowser(url: string): void {
		try {
			if (process.platform === 'win32') {
				childProcess
					.spawn('cmd', ['/c', 'start', '', url], {
						detached: true,
						stdio: 'ignore',
					})
					.unref();
				return;
			}

			if (process.platform === 'darwin') {
				childProcess
					.spawn('open', [url], {
						detached: true,
						stdio: 'ignore',
					})
					.unref();
				return;
			}

			childProcess
				.spawn('xdg-open', [url], {
					detached: true,
					stdio: 'ignore',
				})
				.unref();
		} catch {}
	}

	startBackgroundServe(): void {
		const child = childProcess.spawn(process.execPath, ['serve'], {
			detached: true,
			stdio: 'ignore',
		});

		child.unref();
	}

	stop(pid: number): void {
		process.kill(pid, 'SIGINT');
	}

	forceStop(pid: number): void {
		if (process.platform === 'win32') {
			childProcess.spawnSync('taskkill', ['/pid', String(pid), '/f'], {
				stdio: 'ignore',
			});
			return;
		}

		process.kill(pid, 'SIGKILL');
	}
}
