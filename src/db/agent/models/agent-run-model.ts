import * as z from 'zod';
import { AgentRunStatus } from '#src/agent/app/supervisor/supervisor-shapes';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);

const agentRunStatusSchema = z.enum(AgentRunStatus);

export class AgentRunModel {
	static schema = z.object({
		id: z.uuid(),
		project_id: z.uuid(),
		project_name: z.string().min(1),
		cwd: z.string().min(1),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		agent_version: z.string().min(1),
		status: agentRunStatusSchema,
		error: jsonValueSchema.nullable(),
	});

	readonly id!: string;
	readonly project_id!: string;
	readonly project_name!: string;
	readonly cwd!: string;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly agent_version!: string;
	readonly status!: AgentRunStatus;
	readonly error!: unknown;

	constructor(fields: unknown) {
		const parsed = AgentRunModel.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
