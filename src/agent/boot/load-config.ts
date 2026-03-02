import fsp from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ProcessDefinition } from '#src/agent/app/supervisor/supervisor-shapes';

const processConfigSchema = z.object({
	id: z.string().min(1),
	command: z.string().min(1),
	cwd: z.string().min(1),
	env: z.record(z.string(), z.string()).default({}),
});

const glitchConfigSchema = z.object({
	name: z.string().min(1),
	processes: z.array(processConfigSchema),
	modules: z.record(z.string(), z.unknown()).default({}),
});

export interface GlitchConfig {
	name: string;
	modules: Record<string, unknown>;
	processes: ProcessDefinition[];
}

export async function loadConfig(cwd: string): Promise<GlitchConfig> {
	const filePath = path.resolve(cwd, 'glitch.config.json');
	const content = await fsp.readFile(filePath, 'utf8');
	const parsed = glitchConfigSchema.parse(JSON.parse(content));

	const processes = parsed.processes.map((processDefinition) => {
		const definition = new ProcessDefinition(processDefinition);
		definition.cwd = path.resolve(cwd, definition.cwd);
		return definition;
	});

	return {
		name: parsed.name,
		modules: parsed.modules,
		processes,
	};
}
