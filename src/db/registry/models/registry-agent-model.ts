import { z } from 'zod';
import { type RegistryAgentStatus, registryAgentStatusSchema } from '#src/shared/registry/registry-shapes';

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

export class RegistryAgentModel {
	static schema = z.object({
		id: z.uuid(),
		project_id: z.uuid(),
		cwd: z.string().min(1),
		pid: z.number().int(),
		start_date: z.string().min(1),
		end_date: z.string().min(1).nullable(),
		ping_date: z.string().min(1),
		base_url: z.string().min(1),
		status: registryAgentStatusSchema,
		error: jsonValueSchema.nullable(),
	});

	readonly id!: string;
	readonly project_id!: string;
	readonly cwd!: string;
	readonly pid!: number;
	readonly start_date!: string;
	readonly end_date!: string | null;
	readonly ping_date!: string;
	readonly base_url!: string;
	readonly status!: RegistryAgentStatus;
	readonly error!: unknown;

	constructor(fields: unknown) {
		const parsed = RegistryAgentModel.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
