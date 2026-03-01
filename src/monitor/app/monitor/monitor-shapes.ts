import { z } from 'zod';

export class MonitorProcess {
	static schema = z.object({
		pid: z.number().int().positive(),
		base_url: z.string().min(1),
		start_date: z.string().min(1),
		version: z.string().min(1),
	});

	readonly pid!: number;
	readonly base_url!: string;
	readonly start_date!: string;
	readonly version!: string;

	constructor(fields: unknown) {
		const parsed = MonitorProcess.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
