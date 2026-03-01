import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export async function ensureGlitchHome(glitchHome?: string) {
	const resolvedGlitchHome = glitchHome ?? process.env.GLITCH_HOME ?? resolve(homedir(), '.glitch');

	await mkdir(resolvedGlitchHome, { recursive: true });

	return resolvedGlitchHome;
}
