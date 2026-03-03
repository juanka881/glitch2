import * as z from 'zod';

export class MonitorLock {
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
		const parsed = MonitorLock.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class MonitorStatus {
	static schema = MonitorLock.schema.extend({
		healthy: z.boolean(),
	});

	readonly pid!: number;
	readonly base_url!: string;
	readonly start_date!: string;
	readonly version!: string;
	readonly healthy!: boolean;

	constructor(fields: unknown) {
		const parsed = MonitorStatus.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
