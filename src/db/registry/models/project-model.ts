import { z } from 'zod';

export class ProjectModel {
	static schema = z.object({
		id: z.uuid(),
		name: z.string().min(1),
		cwd: z.string().min(1),
		cwd_hash: z.string().length(64),
		add_date: z.string().min(1),
		last_ping_date: z.string().min(1),
		latest_agent_id: z.uuid().nullable(),
	});

	readonly id!: string;
	readonly name!: string;
	readonly cwd!: string;
	readonly cwd_hash!: string;
	readonly add_date!: string;
	readonly last_ping_date!: string;
	readonly latest_agent_id!: string | null;

	constructor(fields: unknown) {
		const parsed = ProjectModel.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
