import * as z from 'zod';
import { type ProcessStream, processStreamSchema } from '#src/agent/app/supervisor/supervisor-shapes';

export enum MonitorEventName {
	StreamSnapshot = 'stream.snapshot',
	StreamLine = 'stream.line',
	StreamClear = 'stream.clear',
}

export interface EventMessage<TName extends string = string, TBody = unknown> {
	name: TName;
	body: TBody;
}

const roomNameSchema = z.string().min(1);

export class SubscribeInput {
	static schema = z.object({
		rooms: z.array(roomNameSchema).min(1),
	});

	readonly rooms!: string[];

	constructor(fields: unknown) {
		const parsed = SubscribeInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class UnsubscribeInput {
	static schema = z.object({
		rooms: z.array(roomNameSchema).min(1),
	});

	readonly rooms!: string[];

	constructor(fields: unknown) {
		const parsed = UnsubscribeInput.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class StreamLineRecord {
	static schema = z.object({
		agent_id: z.uuid(),
		process_id: z.string().min(1),
		process_run_id: z.uuid(),
		capture_date: z.string().min(1),
		stream: processStreamSchema,
		line: z.string(),
	});

	readonly agent_id!: string;
	readonly process_id!: string;
	readonly process_run_id!: string;
	readonly capture_date!: string;
	readonly stream!: ProcessStream;
	readonly line!: string;

	constructor(fields: unknown) {
		const parsed = StreamLineRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}

export class StreamSnapshotEvent {
	static bodySchema = z.object({
		room: roomNameSchema,
		lines: z.array(StreamLineRecord.schema),
	});

	static schema = z.object({
		name: z.literal(MonitorEventName.StreamSnapshot),
		body: StreamSnapshotEvent.bodySchema,
	});

	readonly name!: MonitorEventName.StreamSnapshot;
	readonly body!: {
		room: string;
		lines: StreamLineRecord[];
	};

	constructor(fields: unknown) {
		const parsed = StreamSnapshotEvent.schema.parse(fields);
		const lines = parsed.body.lines.map((line) => new StreamLineRecord(line));
		const body = {
			room: parsed.body.room,
			lines,
		};

		Object.assign(this, parsed, { body });
	}
}

export class StreamLineEvent
	implements EventMessage<MonitorEventName.StreamLine, { room: string; line: StreamLineRecord }>
{
	static bodySchema = z.object({
		room: roomNameSchema,
		line: StreamLineRecord.schema,
	});

	static schema = z.object({
		name: z.literal(MonitorEventName.StreamLine),
		body: StreamLineEvent.bodySchema,
	});

	readonly name!: MonitorEventName.StreamLine;
	readonly body!: {
		room: string;
		line: StreamLineRecord;
	};

	constructor(fields: unknown) {
		const parsed = StreamLineEvent.schema.parse(fields);
		const line = new StreamLineRecord(parsed.body.line);
		const body = {
			room: parsed.body.room,
			line,
		};

		Object.assign(this, parsed, { body });
	}
}

export class StreamClearEvent implements EventMessage<MonitorEventName.StreamClear, { room: string }> {
	static bodySchema = z.object({
		room: roomNameSchema,
	});

	static schema = z.object({
		name: z.literal(MonitorEventName.StreamClear),
		body: StreamClearEvent.bodySchema,
	});

	readonly name!: MonitorEventName.StreamClear;
	readonly body!: {
		room: string;
	};

	constructor(fields: unknown) {
		const parsed = StreamClearEvent.schema.parse(fields);
		Object.assign(this, parsed, {
			body: {
				room: parsed.body.room,
			},
		});
	}
}

export type MonitorEvent = StreamSnapshotEvent | StreamLineEvent | StreamClearEvent;

export function getAgentRoomName(agentId: string): string {
	return `agent:${agentId}`;
}

export function getProcessStreamRoomName(agentId: string, processId: string): string {
	return `agent:${agentId}:process:${processId}`;
}
