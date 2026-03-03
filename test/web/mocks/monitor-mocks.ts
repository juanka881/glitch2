import { vi } from 'vitest';
import type {
	GetAgentListOutput,
	GetAgentOutput,
	GetMonitorOutput,
	GetProcessListOutput,
	GetProcessLogOutput,
	GetProcessOutput,
	GetProjectListOutput,
	GetProjectOutput,
} from '#src/monitor/app/monitor/api/monitor-api-shapes';
import type { MonitorEventSource } from '#src/web/lib/monitor-event-source';

export function createMonitorApiClientMock() {
	return {
		getMonitor: vi.fn(async (): Promise<GetMonitorOutput> => {
			throw new Error('unused');
		}),
		getProjectList: vi.fn(async (): Promise<GetProjectListOutput> => {
			throw new Error('unused');
		}),
		getProject: vi.fn(async (): Promise<GetProjectOutput> => {
			throw new Error('unused');
		}),
		getAgentList: vi.fn(async (): Promise<GetAgentListOutput> => {
			throw new Error('unused');
		}),
		getAgent: vi.fn(async (): Promise<GetAgentOutput> => {
			throw new Error('unused');
		}),
		getProcessList: vi.fn(async (): Promise<GetProcessListOutput> => {
			throw new Error('unused');
		}),
		getProcess: vi.fn(async (): Promise<GetProcessOutput> => {
			throw new Error('unused');
		}),
		getProcessLog: vi.fn(async (): Promise<GetProcessLogOutput> => {
			throw new Error('unused');
		}),
	};
}

export function createMonitorEventSourceMock() {
	return {
		subscribeToProcess: vi.fn(() => {}),
		unsubscribeFromProcess: vi.fn(() => {}),
		onSnapshot: vi.fn(() => () => {}),
		offSnapshot: vi.fn(() => {}),
		onLine: vi.fn(() => () => {}),
		offLine: vi.fn(() => {}),
		onClear: vi.fn(() => () => {}),
		offClear: vi.fn(() => {}),
	} as unknown as MonitorEventSource;
}
