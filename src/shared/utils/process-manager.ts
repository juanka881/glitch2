import childProcess, { type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { ProcessDefinition } from '#src/agent/app/supervisor/supervisor-shapes';

export interface ProcessOutputStream {
	on(event: 'data', listener: (chunk: Buffer | string) => void): unknown;
}

export interface ManagedChildProcess {
	pid?: number;
	stdout: ProcessOutputStream;
	stderr: ProcessOutputStream;
	on(event: 'error', listener: (error: unknown) => void): void;
	on(event: 'exit', listener: (exitCode: number | null, signal: NodeJS.Signals | null) => void): void;
}

export interface ProcessManager {
	spawn(processDefinition: ProcessDefinition): ManagedChildProcess;
	stop(pid: number): void;
}

export class NodeProcessManager implements ProcessManager {
	spawn(processDefinition: ProcessDefinition): ManagedChildProcess {
		const { file, args } = createShellLaunch(processDefinition.command);

		return childProcess.spawn(file, args, {
			cwd: processDefinition.cwd,
			env: {
				...process.env,
				...processDefinition.env,
			},
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
		}) as unknown as ChildProcessWithoutNullStreams;
	}

	stop(pid: number): void {
		try {
			if (process.platform === 'win32') {
				childProcess.spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], {
					stdio: 'ignore',
				});
				return;
			}

			try {
				process.kill(-pid, 'SIGTERM');
			} catch {
				process.kill(pid, 'SIGTERM');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes('ESRCH')) {
				throw error;
			}
		}
	}
}

function createShellLaunch(command: string): { file: string; args: string[] } {
	if (process.platform === 'win32') {
		return {
			file: process.env.ComSpec ?? 'cmd.exe',
			args: ['/d', '/s', '/c', command],
		};
	}

	return {
		file: process.env.SHELL ?? 'sh',
		args: ['-lc', command],
	};
}
