import { EOL } from 'node:os';
import { v7 as uuidv7 } from 'uuid';
import {
	AgentRunStatus,
	ProcessStatus,
	ProcessStream,
	type ProcessDefinition,
	type ProcessExitEvent,
	type ProcessOutputEvent,
	type ProcessStartEvent,
	type SupervisorEvent,
} from '#src/agent/app/supervisor/shapes';
import type {
	ManagedChildProcess,
	ProcessManager,
} from '#src/agent/app/supervisor/process-manager';
import { NodeProcessManager } from '#src/agent/app/supervisor/process-manager';
import type { SupervisorRepo } from '#src/agent/app/supervisor/repo';
import type { AgentRunModel } from '#src/agent/db/models/agent-run-model';
import type { ProcessRunModel } from '#src/agent/db/models/process-run-model';

interface WritableLike {
	write(chunk: string): unknown;
}

interface StartSupervisorInput {
	projectId: string;
	projectName: string;
	cwd: string;
	agentVersion?: string;
	processes: ProcessDefinition[];
}

interface ManagedProcess {
	child: ManagedChildProcess;
	processRunId: string;
	processId: string;
	pid: number;
	stopRequested: boolean;
	buffers: Record<'stdout' | 'stderr', string>;
	exitPromise: Promise<ProcessRunModel>;
	resolveExit: (run: ProcessRunModel) => void;
	rejectExit: (error: unknown) => void;
}

type EventListener = (event: SupervisorEvent) => void;

export class SupervisorService {
	private readonly repo: SupervisorRepo;
	private readonly stdout: WritableLike;
	private readonly stderr: WritableLike;
	private readonly processManager: ProcessManager;
	private readonly listeners: Set<EventListener>;
	private readonly managedProcesses: Map<string, ManagedProcess>;
	private agentRun: AgentRunModel | null;
	private isStopping: boolean;

	constructor(
		repo: SupervisorRepo,
		stdout?: WritableLike,
		stderr?: WritableLike,
		processManager?: ProcessManager,
	) {
		this.repo = repo;
		this.stdout = stdout ?? process.stdout;
		this.stderr = stderr ?? process.stderr;
		this.processManager = processManager ?? new NodeProcessManager();
		this.listeners = new Set();
		this.managedProcesses = new Map();
		this.agentRun = null;
		this.isStopping = false;
	}

	subscribe(listener: EventListener) {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}

	async start(input: StartSupervisorInput) {
		const startDate = new Date().toISOString();

		this.agentRun = this.repo.createAgentRun({
			id: uuidv7(),
			project_id: input.projectId,
			project_name: input.projectName,
			cwd: input.cwd,
			start_date: startDate,
			agent_version: input.agentVersion ?? '0.0.0',
			status: AgentRunStatus.Start,
		});

		for (const processDefinition of input.processes) {
			this.startProcess(processDefinition);
		}

		this.agentRun = this.repo.updateAgentRun({
			id: this.agentRun.id,
			status: AgentRunStatus.Running,
		});

		return this.agentRun;
	}

	startProcess(processDefinition: ProcessDefinition) {
		const agentRun = this.requireAgentRun();
		const processRun = this.repo.createProcessRun({
			id: uuidv7(),
			agent_run_id: agentRun.id,
			process_id: processDefinition.id,
			command: processDefinition.command,
			cwd: processDefinition.cwd,
			start_date: new Date().toISOString(),
			status: ProcessStatus.Init,
		});

		this.repo.updateProcessRun({
			id: processRun.id,
			status: ProcessStatus.Start,
		});

		const child = this.processManager.spawn(processDefinition);

		if (child.pid === undefined) {
			const failedRun = this.repo.updateProcessRun({
				id: processRun.id,
				status: ProcessStatus.Fail,
				end_date: new Date().toISOString(),
			});
			throw new Error(`Failed to start process ${failedRun.process_id}`);
		}

		let resolveExit!: (run: ProcessRunModel) => void;
		let rejectExit!: (error: unknown) => void;
		const exitPromise = new Promise<ProcessRunModel>((resolve, reject) => {
			resolveExit = resolve;
			rejectExit = reject;
		});

		const managedProcess: ManagedProcess = {
			child,
			processRunId: processRun.id,
			processId: processDefinition.id,
			pid: child.pid,
			stopRequested: false,
			buffers: {
				stdout: '',
				stderr: '',
			},
			exitPromise,
			resolveExit,
			rejectExit,
		};

		this.managedProcesses.set(processDefinition.id, managedProcess);

		const runningProcessRun = this.repo.updateProcessRun({
			id: processRun.id,
			status: ProcessStatus.Running,
			pid: child.pid,
		});

		this.emit({
			name: 'process.start',
			process_run_id: runningProcessRun.id,
			process_id: runningProcessRun.process_id,
			pid: child.pid,
			status: ProcessStatus.Running,
			start_date: runningProcessRun.start_date,
		} satisfies ProcessStartEvent);

		child.stdout.on('data', (chunk) => {
			this.handleStreamData(managedProcess, 'stdout', chunk.toString());
		});

		child.stderr.on('data', (chunk) => {
			this.handleStreamData(managedProcess, 'stderr', chunk.toString());
		});

		child.on('error', (error) => {
			const failedRun = this.repo.updateProcessRun({
				id: processRun.id,
				status: ProcessStatus.Fail,
				end_date: new Date().toISOString(),
			});

			this.emit({
				name: 'process.exit',
				process_run_id: failedRun.id,
				process_id: failedRun.process_id,
				pid: child.pid,
				status: ProcessStatus.Fail,
				end_date: failedRun.end_date ?? new Date().toISOString(),
			} satisfies ProcessExitEvent);

			this.managedProcesses.delete(processDefinition.id);
			rejectExit(error);
		});

		child.on('exit', (exitCode, signal) => {
			this.flushBufferedLines(managedProcess);

			const status = managedProcess.stopRequested
				? ProcessStatus.Stop
				: ProcessStatus.Exit;
			const finishedRun = this.repo.updateProcessRun({
				id: processRun.id,
				status,
				end_date: new Date().toISOString(),
				exit_code: exitCode ?? null,
				signal: signal ?? null,
			});

			this.emit({
				name: 'process.exit',
				process_run_id: finishedRun.id,
				process_id: finishedRun.process_id,
				pid: child.pid,
				status,
				end_date: finishedRun.end_date ?? new Date().toISOString(),
				exit_code: finishedRun.exit_code ?? undefined,
				signal: finishedRun.signal ?? undefined,
			} satisfies ProcessExitEvent);

			this.managedProcesses.delete(processDefinition.id);
			resolveExit(finishedRun);
		});

		return runningProcessRun;
	}

	async stopProcess(processId: string) {
		const managedProcess = this.managedProcesses.get(processId);

		if (!managedProcess) {
			return null;
		}

		managedProcess.stopRequested = true;
		this.processManager.stop(managedProcess.pid);

		return managedProcess.exitPromise;
	}

	async shutdown() {
		if (this.isStopping) {
			return this.agentRun;
		}

		this.isStopping = true;
		await Promise.all(
			[...this.managedProcesses.keys()].map((processId) =>
				this.stopProcess(processId),
			),
		);

		if (this.agentRun) {
			this.agentRun = this.repo.updateAgentRun({
				id: this.agentRun.id,
				status: AgentRunStatus.Exit,
				end_date: new Date().toISOString(),
			});
		}

		return this.agentRun;
	}

	async fail(error: unknown) {
		const agentRun = this.requireAgentRun();

		this.agentRun = this.repo.updateAgentRun({
			id: agentRun.id,
			status: AgentRunStatus.Fail,
			end_date: new Date().toISOString(),
			error: toErrorPayload(error),
		});

		await Promise.all(
			[...this.managedProcesses.keys()].map((processId) =>
				this.stopProcess(processId),
			),
		);

		return this.agentRun;
	}

	getAgentRun() {
		return this.agentRun;
	}

	waitForProcessExit(processId: string) {
		const managedProcess = this.managedProcesses.get(processId);
		return managedProcess?.exitPromise ?? null;
	}

	private requireAgentRun() {
		if (!this.agentRun) {
			throw new Error('Supervisor has not started');
		}

		return this.agentRun;
	}

	private handleStreamData(
		managedProcess: ManagedProcess,
		stream: 'stdout' | 'stderr',
		chunk: string,
	) {
		managedProcess.buffers[stream] += chunk;
		const lines = managedProcess.buffers[stream].split(/\r?\n/);
		managedProcess.buffers[stream] = lines.pop() ?? '';

		for (const line of lines) {
			this.emitProcessLine(managedProcess, stream, line);
		}
	}

	private flushBufferedLines(managedProcess: ManagedProcess) {
		for (const stream of ['stdout', 'stderr'] as const) {
			const line = managedProcess.buffers[stream];
			if (!line) {
				continue;
			}

			managedProcess.buffers[stream] = '';
			this.emitProcessLine(managedProcess, stream, line);
		}
	}

	private emitProcessLine(
		managedProcess: ManagedProcess,
		stream: 'stdout' | 'stderr',
		line: string,
	) {
		const captureDate = new Date().toISOString();
		const processStream =
			stream === 'stdout' ? ProcessStream.Stdout : ProcessStream.Stderr;

		if (stream === 'stdout') {
			this.stdout.write(`${line}${EOL}`);
		} else {
			this.stderr.write(`${line}${EOL}`);
		}

		this.emit({
			name: stream === 'stdout' ? 'process.stdout' : 'process.stderr',
			process_run_id: managedProcess.processRunId,
			process_id: managedProcess.processId,
			pid: managedProcess.pid,
			stream: processStream,
			capture_date: captureDate,
			line,
		} satisfies ProcessOutputEvent);
	}

	private emit(event: SupervisorEvent) {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

function toErrorPayload(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack ?? null,
		};
	}

	return {
		message: String(error),
	};
}
