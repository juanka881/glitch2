import fsp from 'node:fs/promises';
import path from 'node:path';
import { MonitorProcess } from '#src/monitor/app/monitor/monitor-shapes';

export class MonitorRepo {
	private readonly glitchHome: string;

	constructor(glitchHome: string) {
		this.glitchHome = glitchHome;
	}

	async readProcess() {
		try {
			const filePath = this.getMetadataPath();
			const raw = await fsp.readFile(filePath, 'utf8');
			return new MonitorProcess(JSON.parse(raw));
		} catch {
			return null;
		}
	}

	async writeProcess(monitorProcess: MonitorProcess) {
		const filePath = this.getMetadataPath();
		await fsp.writeFile(filePath, `${JSON.stringify(monitorProcess, null, 2)}\n`, 'utf8');
	}

	async clearProcess() {
		const filePath = this.getMetadataPath();
		await fsp.rm(filePath, { force: true });
	}

	getMetadataPath() {
		return path.resolve(this.glitchHome, 'monitor.json');
	}
}
