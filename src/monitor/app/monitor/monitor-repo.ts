import fsp from 'node:fs/promises';
import { MonitorLock } from '#src/monitor/app/monitor/monitor-shapes';

export type MonitorLockWriter = (monitorLock: MonitorLock) => Promise<void>;

export class MonitorRepo {
	private readonly lockPath: string;
	private readonly tempLockPath: string;

	constructor(lockPath: string) {
		this.lockPath = lockPath;
		this.tempLockPath = `${lockPath}.tmp`;
	}

	async readLock(): Promise<MonitorLock | undefined> {
		try {
			const data = await fsp.readFile(this.lockPath, 'utf-8');
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

			const writeLock: MonitorLockWriter = async (monitorLock) => {
				const data = JSON.stringify(monitorLock, null, 2);

				try {
					await fsp.writeFile(this.tempLockPath, data, 'utf-8');
				} finally {
					await handle.close();
				}

				await fsp.unlink(this.lockPath);
				await fsp.rename(this.tempLockPath, this.lockPath);
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
		try {
			await fsp.unlink(this.lockPath);
		} catch (error) {
			if (isMissing(error)) {
				await removeIfPresent(this.tempLockPath);
				return;
			}

			throw error;
		}

		await removeIfPresent(this.tempLockPath);
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
