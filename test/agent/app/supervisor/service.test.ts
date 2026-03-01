import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'bun:test';
import type {
	ManagedChildProcess,
	ProcessManager,
} from '#src/agent/app/supervisor/process-manager';
import {
	AgentRunStatus,
	ProcessDefinition,
	ProcessStatus,
} from '#src/agent/app/supervisor/shapes';
import { SupervisorRepo } from '#src/agent/app/supervisor/repo';
import { SupervisorService } from '#src/agent/app/supervisor/service';
import { DbClient } from '#src/agent/db/client';
import { Migrator } from '#src/agent/db/migration';
import { migrations } from '#src/agent/db/migrations';

class FakeChildProcess extends EventEmitter implements ManagedChildProcess {
	pid?: number;
	stdout: PassThrough;
	stderr: PassThrough;

	constructor(pid: number) {
		super();
		this.pid = pid;
		this.stdout = new PassThrough();
		this.stderr = new PassThrough();
	}

	exit(exitCode: number, signal: NodeJS.Signals | null) {
		this.stdout.end();
		this.stderr.end();
		this.emit('exit', exitCode, signal);
	}
}

class FakeProcessManager implements ProcessManager {
	private readonly children: Map<string, FakeChildProcess>;
	private pidCounter: number;

	constructor() {
		this.children = new Map();
		this.pidCounter = 2000;
	}

	spawn(processDefinition: ProcessDefinition) {
		const child = new FakeChildProcess(this.pidCounter);
		this.pidCounter += 1;
		this.children.set(processDefinition.id, child);
		return child;
	}

	stop(pid: number) {
		for (const child of this.children.values()) {
			if (child.pid === pid) {
				child.exit(0, null);
			}
		}
	}

	getChild(processId: string) {
		return this.children.get(processId) ?? null;
	}
}

function createService() {
	const db = DbClient.memory();
	const migrator = new Migrator(db);
	migrator.apply(migrations);

	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];
	const stdout = {
		write(chunk: string) {
			stdoutChunks.push(chunk);
		},
	};
	const stderr = {
		write(chunk: string) {
			stderrChunks.push(chunk);
		},
	};
	const processManager = new FakeProcessManager();

	const repo = new SupervisorRepo(db);
	const service = new SupervisorService(repo, stdout, stderr, processManager);

	return {
		db,
		repo,
		service,
		stdoutChunks,
		stderrChunks,
		processManager,
	};
}

test('SupervisorService starts a process, emits events, and persists run state', async () => {
	const { db, repo, service, stdoutChunks, stderrChunks, processManager } =
		createService();

	try {
		const events: string[] = [];
		const lines: string[] = [];

		service.subscribe((event) => {
			events.push(event.name);
			if ('line' in event) {
				lines.push(event.line);
			}
		});

		await service.start({
			projectId: '11111111-1111-4111-8111-111111111111',
			projectName: 'demo',
			cwd: 'C:/demo',
			agentVersion: '1.0.0',
			processes: [
				new ProcessDefinition({
					id: 'fixture',
					command: 'fixture',
					cwd: process.cwd(),
					env: {},
				}),
			],
		});

		const exitPromise = service.waitForProcessExit('fixture');
		assert(exitPromise, 'process exit promise must be available');

		const child = processManager.getChild('fixture');
		assert(child, 'child process must exist');

		child.stdout.write('stdout-line\n');
		child.stderr.write('stderr-line\n');
		child.exit(0, null);

		await exitPromise;

		const storedProcessRun = repo.listProcessRunsByAgentRunId(
			service.getAgentRun()!.id,
		)[0];

		assert(events.includes('process.start'), 'process.start must be emitted');
		assert(events.includes('process.stdout'), 'process.stdout must be emitted');
		assert(events.includes('process.stderr'), 'process.stderr must be emitted');
		assert(events.includes('process.exit'), 'process.exit must be emitted');
		assert(lines.includes('stdout-line'), 'stdout line must be emitted');
		assert(lines.includes('stderr-line'), 'stderr line must be emitted');
		assert(
			stdoutChunks.some((chunk) => chunk.includes('stdout-line')),
			'stdout must be forwarded',
		);
		assert(
			stderrChunks.some((chunk) => chunk.includes('stderr-line')),
			'stderr must be forwarded',
		);
		assert(
			storedProcessRun?.status === ProcessStatus.Exit,
			'process run must finish with exit status',
		);
	} finally {
		await service.shutdown();
		db.close();
	}
});

test('SupervisorService stops a process and records stop status', async () => {
	const { db, repo, service } = createService();

	try {
		const exitStatuses: string[] = [];

		service.subscribe((event) => {
			if (event.name === 'process.exit') {
				exitStatuses.push(event.status);
			}
		});

		await service.start({
			projectId: '11111111-1111-4111-8111-111111111111',
			projectName: 'demo',
			cwd: 'C:/demo',
			agentVersion: '1.0.0',
			processes: [
				new ProcessDefinition({
					id: 'fixture',
					command: 'fixture',
					cwd: process.cwd(),
					env: {},
				}),
			],
		});

		const exitPromise = service.stopProcess('fixture');
		assert(exitPromise, 'process exit promise must exist');
		await exitPromise;

		const storedProcessRun = repo.listProcessRunsByAgentRunId(
			service.getAgentRun()!.id,
		)[0];

		assert(
			exitStatuses.includes(ProcessStatus.Stop),
			'process exit event must record stop status',
		);
		assert(
			storedProcessRun?.status === ProcessStatus.Stop,
			'process run must finish with stop status',
		);
	} finally {
		await service.shutdown();
		db.close();
	}
});

test('SupervisorService records agent failure details', async () => {
	const { db, service } = createService();

	try {
		await service.start({
			projectId: '11111111-1111-4111-8111-111111111111',
			projectName: 'demo',
			cwd: 'C:/demo',
			agentVersion: '1.0.0',
			processes: [],
		});

		const failedRun = await service.fail(new Error('boom'));
		const errorPayload = failedRun.error as {
			message: string;
			name: string;
			stack: string | null;
		};

		assert(
			failedRun.status === AgentRunStatus.Fail,
			'agent run status must become fail',
		);
		assert(errorPayload.name === 'Error', 'error name must be captured');
		assert(errorPayload.message === 'boom', 'error message must be captured');
	} finally {
		db.close();
	}
});
