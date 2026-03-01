import { z } from 'zod';

export enum AgentRunStatus {
	Start = 'start',
	Running = 'running',
	Fail = 'fail',
	Exit = 'exit',
}

export enum ProcessStatus {
	Init = 'init',
	Start = 'start',
	Running = 'running',
	Stop = 'stop',
	Exit = 'exit',
	Fail = 'fail',
}

export enum ProcessStream {
	Stdout = 'stdout',
	Stderr = 'stderr',
}

export const agentRunStatusSchema = z.enum(AgentRunStatus);
export const processStatusSchema = z.enum(ProcessStatus);
export const processStreamSchema = z.enum(ProcessStream);

export class ProcessDefinition {
	static schema = z.object({
		id: z.string().min(1),
		command: z.string().min(1),
		cwd: z.string().min(1),
		env: z.record(z.string(), z.string()),
	});

	id!: string;
	command!: string;
	cwd!: string;
	env!: Record<string, string>;

	constructor(fields: unknown) {
		const parsed = ProcessDefinition.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export interface ProcessStartEvent {
	name: 'process.start';
	process_run_id: string;
	process_id: string;
	pid: number;
	status: ProcessStatus;
	start_date: string;
}

export interface ProcessOutputEvent {
	name: 'process.stdout' | 'process.stderr';
	process_run_id: string;
	process_id: string;
	pid: number;
	stream: ProcessStream;
	capture_date: string;
	line: string;
}

export interface ProcessExitEvent {
	name: 'process.exit';
	process_run_id: string;
	process_id: string;
	pid?: number;
	status: ProcessStatus;
	end_date: string;
	exit_code?: number;
	signal?: string;
}

export type SupervisorEvent = ProcessStartEvent | ProcessOutputEvent | ProcessExitEvent;
