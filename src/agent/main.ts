import { styleText } from 'node:util';
import { bootstrapAgent } from '#src/agent/boot/bootstrap-agent';

async function main() {
	const runtime = await bootstrapAgent(process.cwd());
	const agentVersion = await loadAgentVersion();
	let isStopping = false;

	writeStartupPreamble(agentVersion, runtime.config.processes);

	async function shutdown() {
		if (isStopping) {
			return;
		}

		isStopping = true;
		await runtime.supervisor.shutdown();
		runtime.db.close();
		process.exit(0);
	}

	process.on('SIGINT', () => {
		void shutdown();
	});

	process.on('SIGTERM', () => {
		void shutdown();
	});

	try {
		await runtime.supervisor.start({
			projectId: runtime.projectId,
			projectName: runtime.config.name,
			cwd: process.cwd(),
			agentVersion,
			processes: runtime.config.processes,
		});
	} catch (error) {
		await runtime.supervisor.fail(error);
		runtime.db.close();
		throw error;
	}

	await new Promise(() => {});
}

async function loadAgentVersion() {
	const packageJsonUrl = new URL('../../package.json', import.meta.url);

	try {
		const packageJson = await Bun.file(packageJsonUrl).json();

		if (
			packageJson &&
			typeof packageJson === 'object' &&
			'version' in packageJson &&
			typeof packageJson.version === 'string'
		) {
			return packageJson.version;
		}
	} catch {}

	return '0.0.0';
}

function writeStartupPreamble(
	agentVersion: string,
	processes: Array<{ id: string; command: string }>,
) {
	process.stdout.write(`glitch agent ${agentVersion}\n`);
	process.stdout.write(`> starting commands...\n`);

	for (const processDefinition of processes) {
		const prefix = `- ${styleText('blue', processDefinition.id)}`;
		const command = formatCommand(processDefinition.command, prefix.length);
		process.stdout.write(`${prefix}  ${styleText('gray', command)}\n`);
	}

	process.stdout.write('\n');
}

function formatCommand(command: string, prefixLength: number) {
	const columns = process.stdout.columns ?? 100;
	const maxCommandLength = Math.max(16, columns - prefixLength - 1);

	if (command.length <= maxCommandLength) {
		return command;
	}

	return `${command.slice(0, Math.max(0, maxCommandLength - 3))}...`;
}

await main();
