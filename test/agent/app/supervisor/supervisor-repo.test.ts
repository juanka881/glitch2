import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AgentRunStatus, ProcessStatus } from '#src/agent/app/supervisor/supervisor-shapes';
import { SupervisorRepo } from '#src/agent/app/supervisor/supervisor-repo';
import { migrations } from '#src/db/agent/migrations';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';

function createRepo() {
	const db = DbClient.memory();
	const migrator = new Migrator(db);
	migrator.apply(migrations);

	return {
		db,
		repo: new SupervisorRepo(db),
	};
}

test('SupervisorRepo.createAgentRun inserts and returns an agent run', () => {
	const { db, repo } = createRepo();

	try {
		const agentRun = repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		assert(agentRun.status === 'start', 'agent run must be inserted');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.updateAgentRun updates status and error', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		const updated = repo.updateAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			status: AgentRunStatus.Fail,
			end_date: '2026-02-28T22:01:00.000Z',
			error: { message: 'boom' },
		});

		assert(updated.status === 'fail', 'agent run status must update');
		assert.deepEqual(updated.error, { message: 'boom' }, 'agent run error must update');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.getAgentRunById returns a persisted run', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		const agentRun = repo.getAgentRunById('11111111-1111-4111-8111-111111111111');

		assert(agentRun.id === '11111111-1111-4111-8111-111111111111', 'agent run must be fetched');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.createProcessRun inserts and returns a process run', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		const processRun = repo.createProcessRun({
			id: '33333333-3333-4333-8333-333333333333',
			agent_run_id: '11111111-1111-4111-8111-111111111111',
			process_id: 'web',
			command: 'bun run dev',
			cwd: '.',
			start_date: '2026-02-28T22:00:00.000Z',
			status: ProcessStatus.Init,
		});

		assert(processRun.status === 'init', 'process run must be inserted');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.updateProcessRun updates a process run', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		repo.createProcessRun({
			id: '33333333-3333-4333-8333-333333333333',
			agent_run_id: '11111111-1111-4111-8111-111111111111',
			process_id: 'web',
			command: 'bun run dev',
			cwd: '.',
			start_date: '2026-02-28T22:00:00.000Z',
			status: ProcessStatus.Init,
		});

		const processRun = repo.updateProcessRun({
			id: '33333333-3333-4333-8333-333333333333',
			status: ProcessStatus.Running,
			pid: 12345,
		});

		assert(processRun.status === 'running', 'process run status must update');
		assert(processRun.pid === 12345, 'process run pid must update');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.getProcessRunById returns a persisted process run', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		repo.createProcessRun({
			id: '33333333-3333-4333-8333-333333333333',
			agent_run_id: '11111111-1111-4111-8111-111111111111',
			process_id: 'web',
			command: 'bun run dev',
			cwd: '.',
			start_date: '2026-02-28T22:00:00.000Z',
			status: ProcessStatus.Init,
		});

		const processRun = repo.getProcessRunById('33333333-3333-4333-8333-333333333333');

		assert(processRun.process_id === 'web', 'process run must be fetched');
	} finally {
		db.close();
	}
});

test('SupervisorRepo.listProcessRunsByAgentRunId returns ordered process runs', () => {
	const { db, repo } = createRepo();

	try {
		repo.createAgentRun({
			id: '11111111-1111-4111-8111-111111111111',
			project_id: '22222222-2222-4222-8222-222222222222',
			project_name: 'demo',
			cwd: 'C:/demo',
			start_date: '2026-02-28T22:00:00.000Z',
			agent_version: '1.0.0',
			status: AgentRunStatus.Start,
		});

		repo.createProcessRun({
			id: '33333333-3333-4333-8333-333333333333',
			agent_run_id: '11111111-1111-4111-8111-111111111111',
			process_id: 'web',
			command: 'bun run dev',
			cwd: '.',
			start_date: '2026-02-28T22:00:00.000Z',
			status: ProcessStatus.Init,
		});

		repo.createProcessRun({
			id: '44444444-4444-4444-8444-444444444444',
			agent_run_id: '11111111-1111-4111-8111-111111111111',
			process_id: 'worker',
			command: 'bun run worker',
			cwd: '.',
			start_date: '2026-02-28T22:00:01.000Z',
			status: ProcessStatus.Init,
		});

		const processRuns = repo.listProcessRunsByAgentRunId('11111111-1111-4111-8111-111111111111');

		assert(processRuns.length === 2, 'process runs must be listed');
		assert(processRuns[1]?.process_id === 'worker', 'process runs must remain ordered by start_date');
	} finally {
		db.close();
	}
});

