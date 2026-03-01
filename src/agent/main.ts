import util, { type InspectColor } from 'node:util';
import { bootstrapAgent } from '#src/agent/boot/bootstrap-agent';
import { getBuildVersion } from '#src/shared/build';
import { ensureGlitchHome } from '#src/shared/utils/glitch-home';
import { ShutdownManager } from '#src/shared/utils/shutdown-manager';
import { configure, getConsoleSink, getLogger, type Logger, type TextFormatter } from '@logtape/logtape';
import type { ProcessDefinition } from '#src/agent/app/supervisor/supervisor-shapes';
import prettyms from 'pretty-ms';

export const PING_TIMER_SEC = 30;

function writeStartupPreamble(agentVersion: string, processes: ProcessDefinition[]) {
	console.log(`glitch v${agentVersion}`);
	console.log();
	console.log(`starting supervisor [${processes.length}] `);

	for (const processDefinition of processes) {
		const prefix = `| ${util.styleText('blue', processDefinition.id)}`;
		const command = formatCommand(processDefinition.command, prefix.length);
		console.log(`${prefix} ${util.styleText('gray', command)}`);
	}

	console.log();
}

function formatCommand(command: string, prefixLength: number) {
	const columns = process.stdout.columns ?? 100;
	const maxCommandLength = Math.max(16, columns - prefixLength - 1);

	if (command.length <= maxCommandLength) {
		return command;
	}

	return `${command.slice(0, Math.max(0, maxCommandLength - 3))}...`;
}

const consoleFormatter: TextFormatter = (record) => {
	const time = new Date(record.timestamp);
	const hour = time.getHours().toString().padStart(2, '0');
	const minute = time.getMinutes().toString().padStart(2, '0');
	const second = time.getSeconds().toString().padStart(2, '0');
	const millisecond = time.getMilliseconds().toString().padStart(3, '0');

	let levelColor: InspectColor = 'gray';
	let levelAbbr = 'NUL';
	switch (record.level) {
		case 'debug': {
			levelColor = 'blue';
			levelAbbr = 'DBG';
			break;
		}
		case 'trace': {
			levelColor = 'cyan';
			levelAbbr = 'TRX';
			break;
		}
		case 'info': {
			levelColor = 'green';
			levelAbbr = 'INF';
			break;
		}
		case 'warning': {
			levelColor = 'yellow';
			levelAbbr = 'WRN';
			break;
		}
		case 'error': {
			levelColor = 'red';
			levelAbbr = 'ERR';
			break;
		}
		case 'fatal': {
			levelColor = 'magenta';
			levelAbbr = 'FTL';
		}
	}

	const timeText = util.styleText('gray', `${hour}:${minute}:${second}.${millisecond}`);
	const levelText = util.styleText(levelColor, levelAbbr);
	let categoryText = record.category.length > 0 ? `${record.category.join(':')}` : '';
	categoryText = util.styleText('gray', categoryText);

	return `${timeText} ${levelText} ${categoryText} ${record.message}`;
};

async function main() {
	const manager = new ShutdownManager();
	manager.setExitCallback((code) => process.exit(code));

	try {
		await configure({
			sinks: {
				console: getConsoleSink({
					formatter: consoleFormatter,
				}),
			},
			loggers: [
				{
					category: ['logtape', 'meta'],
					sinks: ['console'],
					lowestLevel: 'warning',
				},
				{
					category: ['glitch'],
					sinks: ['console'],
					lowestLevel: 'debug',
				},
			],
		});

		const log: Logger = getLogger(['glitch', 'agent']);

		const agentVersion = getBuildVersion();
		const glitchHome = await ensureGlitchHome();

		const runtime = await bootstrapAgent(process.cwd(), glitchHome);
		manager.register('close databases', () => {
			runtime.agentDb.close();
			runtime.registryDb.close();
		});

		const startDate = new Date().toISOString();

		writeStartupPreamble(agentVersion, runtime.config.processes);

		runtime.registry.registerAgentStart({
			agentId: runtime.agentId,
			projectId: runtime.projectId,
			cwd: process.cwd(),
			pid: process.pid,
			startDate,
			pingDate: startDate,
			baseUrl: runtime.baseUrl,
		});

		process.on('SIGINT', () => manager.shutdown(130, 'SIGINT'));
		process.on('SIGTERM', () => manager.shutdown(143, 'SIGTERM'));

		if (process.platform === 'win32') {
			process.on('SIGBREAK', () => manager.shutdown(131, 'SIGBREAK'));
		}

		process.on('uncaughtException', async (error) => {
			log.error('uncaughte exception', { error });
			await manager.shutdown(1, 'uncaught exception');
		});

		process.on('unhandledRejection', async (error) => {
			log.error('unhandled rejection', { error });
			await manager.shutdown(1, 'unhandled rejection');
		});

		await runtime.supervisor.start({
			agentId: runtime.agentId,
			projectId: runtime.projectId,
			projectName: runtime.config.name,
			cwd: process.cwd(),
			agentVersion,
			processes: runtime.config.processes,
		});

		runtime.registry.markAgentRunning({
			agentId: runtime.agentId,
			projectId: runtime.projectId,
			pingDate: new Date().toISOString(),
		});

		const pingInterval = PING_TIMER_SEC * 1000;
		log.debug(`start ping timer interval=${prettyms(pingInterval, { compact: true })}`);

		const pingTimer = setInterval(() => {
			if (manager.isShuttingDown) {
				return;
			}

			runtime.registry.pingAgent({
				agentId: runtime.agentId,
				projectId: runtime.projectId,
				pingDate: new Date().toISOString(),
			});
		}, pingInterval);
		manager.register('shutdown supervisor', () => runtime.supervisor.shutdown());
		manager.register('set agent status', () => {
			runtime.registry.markAgentExit({
				agentId: runtime.agentId,
				endDate: new Date().toISOString(),
			});
		});
		manager.register('clear ping timer', () => clearInterval(pingTimer));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await manager.shutdown(1, `error: ${message}`);
	}
}

void main();
