import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DbClient } from '#src/db/client';
import { Migrator } from '#src/db/migration';
import { migrations } from '#src/db/registry/migrations';
import { RegistryRepo } from '#src/shared/registry/registry-repo';
import { RegistryService } from '#src/shared/registry/registry-service';
import { RegistryAgentStatus } from '#src/shared/registry/registry-shapes';

function createService() {
	const db = DbClient.memory();
	const migrator = new Migrator(db);
	migrator.apply(migrations);

	const repo = new RegistryRepo(db);
	const service = new RegistryService(repo);

	return {
		db,
		repo,
		service,
	};
}

test('RegistryService registers a project and agent lifecycle', () => {
	const { db, repo, service } = createService();

	try {
		const project = service.ensureProject({
			name: 'demo',
			cwd: 'C:/Demo/App',
			pingDate: '2026-03-01T00:00:00.000Z',
		});
		service.registerAgentStart({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			cwd: 'C:/Demo/App',
			pid: 12345,
			startDate: '2026-03-01T00:00:00.000Z',
			pingDate: '2026-03-01T00:00:00.000Z',
			baseUrl: 'http://127.0.0.1:18001',
		});
		service.markAgentRunning({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			pingDate: '2026-03-01T00:01:00.000Z',
		});
		service.pingAgent({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			pingDate: '2026-03-01T00:02:00.000Z',
		});

		const storedProject = repo.getProjectById(project.id);
		const agent = repo.getAgentById('22222222-2222-7222-8222-222222222222');

		assert(storedProject, 'project must exist');
		assert(
			storedProject?.latest_agent_id === '22222222-2222-7222-8222-222222222222',
			'latest_agent_id must update when the agent reaches running',
		);
		assert(storedProject?.last_ping_date === '2026-03-01T00:02:00.000Z', 'project last_ping_date must update on ping');
		assert(agent.status === RegistryAgentStatus.Running, 'agent must be running');
		assert(agent.ping_date === '2026-03-01T00:02:00.000Z', 'agent ping_date must update');
	} finally {
		db.close();
	}
});

test('RegistryService matches projects case-insensitively through cwd_hash', () => {
	const { db, repo, service } = createService();

	try {
		const firstProject = service.ensureProject({
			name: 'demo',
			cwd: 'C:/Demo/App',
			pingDate: '2026-03-01T00:00:00.000Z',
		});
		const secondProject = service.ensureProject({
			name: 'demo',
			cwd: 'c:/demo/app',
			pingDate: '2026-03-01T00:05:00.000Z',
		});

		const project = repo.getProjectById(firstProject.id);
		const total = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM projects');

		assert(total?.total === 1, 'project row must be reused across path casing');
		assert(firstProject.id === secondProject.id, 'project id must be reused across path casing');
		assert(
			project?.last_ping_date === '2026-03-01T00:05:00.000Z',
			'project last_ping_date must update on repeated registration',
		);
	} finally {
		db.close();
	}
});

test('RegistryService marks stale start and running agents as crash', () => {
	const { db, repo, service } = createService();

	try {
		const project = service.ensureProject({
			name: 'demo',
			cwd: 'C:/Demo/App',
			pingDate: '2026-03-01T00:00:00.000Z',
		});
		service.registerAgentStart({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			cwd: 'C:/Demo/App',
			pid: 12345,
			startDate: '2026-03-01T00:00:00.000Z',
			pingDate: '2026-03-01T00:00:00.000Z',
			baseUrl: 'http://127.0.0.1:18001',
		});
		service.markAgentRunning({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			pingDate: '2026-03-01T00:01:00.000Z',
		});
		service.markCrashedAgents('2026-03-01T00:03:00.000Z', '2026-03-01T00:06:00.000Z');

		const agent = repo.getAgentById('22222222-2222-7222-8222-222222222222');

		assert(agent.status === RegistryAgentStatus.Crash, 'agent must become crash');
		assert(agent.end_date === '2026-03-01T00:06:00.000Z', 'crash cleanup must write end_date');
	} finally {
		db.close();
	}
});

test('RegistryService records failure details in the registry agent row', () => {
	const { db, repo, service } = createService();

	try {
		const project = service.ensureProject({
			name: 'demo',
			cwd: 'C:/Demo/App',
			pingDate: '2026-03-01T00:00:00.000Z',
		});
		service.registerAgentStart({
			agentId: '22222222-2222-7222-8222-222222222222',
			projectId: project.id,
			cwd: 'C:/Demo/App',
			pid: 12345,
			startDate: '2026-03-01T00:00:00.000Z',
			pingDate: '2026-03-01T00:00:00.000Z',
			baseUrl: 'http://127.0.0.1:18001',
		});
		service.markAgentFail({
			agentId: '22222222-2222-7222-8222-222222222222',
			endDate: '2026-03-01T00:02:00.000Z',
			error: { message: 'boom' },
		});

		const agent = repo.getAgentById('22222222-2222-7222-8222-222222222222');

		assert(agent.status === RegistryAgentStatus.Fail, 'agent must become fail');
		assert.deepEqual(agent.error, { message: 'boom' }, 'agent error must be preserved');
	} finally {
		db.close();
	}
});

