import { z } from 'zod';
import { ProcessStatus } from '#src/agent/app/supervisor/shapes';

const processStatusSchema = z.enum(ProcessStatus);

export class ProcessRunModel {
	static schema = z.object({
		id: z.uuid(),
		agent_run_id: z.uuid(),
		process_id: z.string().min(1),
		command: z.string().min(1),
		cwd: z.string().min(1),
		pid: z.number().int().nullable(),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		exit_code: z.number().int().nullable(),
		signal: z.string().min(1).nullable(),
		status: processStatusSchema,
	});

	readonly id!: string;
	readonly agent_run_id!: string;
	readonly process_id!: string;
	readonly command!: string;
	readonly cwd!: string;
	readonly pid!: number | null;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly exit_code!: number | null;
	readonly signal!: string | null;
	readonly status!: ProcessStatus;

	constructor(fields: unknown) {
		const parsed = ProcessRunModel.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
