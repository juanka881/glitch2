import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { v7 as uuidv7 } from 'uuid';

export async function loadOrCreateProjectId(cwd: string) {
	const filePath = resolve(cwd, '.glitch', 'id');

	try {
		const existing = await readFile(filePath, 'utf8');
		return existing.trim();
	} catch {
		await mkdir(dirname(filePath), { recursive: true });
		const projectId = uuidv7();
		await writeFile(filePath, `${projectId}\n`, 'utf8');
		return projectId;
	}
}
