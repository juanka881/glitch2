import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function ensureGlitchHome(glitchHome?: string): Promise<string> {
	const resolvedGlitchHome = glitchHome ?? process.env.GLITCH_HOME ?? path.resolve(os.homedir(), '.glitch');

	await fsp.mkdir(resolvedGlitchHome, { recursive: true });

	return resolvedGlitchHome;
}
