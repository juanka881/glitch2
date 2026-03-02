import fsp from 'node:fs/promises';
import path from 'node:path';
import { MonitorLock } from '#src/monitor/app/monitor/monitor-shapes';

export type MonitorLockWriter = (monitorLock: MonitorLock) => Promise<void>;

export class MonitorRepo {
	private readonly lockPath: string;
	private readonly statePath: string;
	private readonly tempStatePath: string;
	private lockHandle?: fsp.FileHandle;

	constructor(glitchHome: string) {
		this.lockPath = path.resolve(glitchHome, 'monitor.lock');
		this.statePath = path.resolve(glitchHome, 'monitor.state.json');
		this.tempStatePath = path.resolve(glitchHome, 'monitor.state.json.tmp');
		this.lockHandle = undefined;
	}

	async readLock(): Promise<MonitorLock | undefined> {
		try {
			await fsp.access(this.lockPath);
			const data = await fsp.readFile(this.statePath, 'utf-8');
			const fields = JSON.parse(data) as unknown;

			return new MonitorLock(fields);
		} catch (error) {
			if (isMissing(error)) {
				return undefined;
			}

			if (isIncompleteJson(error)) {
				return undefined;
			}

			throw error;
		}
	}

	async acquireLock(): Promise<MonitorLockWriter | undefined> {
		try {
			const handle = await fsp.open(this.lockPath, 'wx');
			this.lockHandle = handle;

			const writeLock: MonitorLockWriter = async (monitorLock) => {
				const data = JSON.stringify(monitorLock, null, 2);

				await fsp.writeFile(this.tempStatePath, data, 'utf-8');
				await removeIfPresent(this.statePath);
				await fsp.rename(this.tempStatePath, this.statePath);
			};

			return writeLock;
		} catch (error) {
			if (isAlreadyExists(error)) {
				return undefined;
			}

			throw error;
		}
	}

	async removeLock(): Promise<void> {
		if (this.lockHandle) {
			await this.lockHandle.close();
			this.lockHandle = undefined;
		}

		try {
			await fsp.unlink(this.lockPath);
		} catch (error) {
			if (isMissing(error)) {
				await removeIfPresent(this.statePath);
				await removeIfPresent(this.tempStatePath);
				return;
			}

			throw error;
		}

		await removeIfPresent(this.statePath);
		await removeIfPresent(this.tempStatePath);
	}
}

function isMissing(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isAlreadyExists(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

function isIncompleteJson(error: unknown): boolean {
	return error instanceof SyntaxError;
}

async function removeIfPresent(path: string): Promise<void> {
	try {
		await fsp.unlink(path);
	} catch (error) {
		if (isMissing(error)) {
			return;
		}

		throw error;
	}
}
