import {
	getProcessStreamRoomName,
	MonitorEventName,
	StreamClearEvent,
	StreamLineEvent,
	StreamLineRecord,
	StreamSnapshotEvent,
} from '#src/shared/events/monitor-event-shapes';
import type { EventBus } from '#src/shared/events/event-bus';

export class MonitorStreamService {
	private readonly eventBus: EventBus;
	private readonly bufferSize: number;
	private readonly linesByRoom: Map<string, StreamLineRecord[]>;

	constructor(eventBus: EventBus, bufferSize = 100) {
		this.eventBus = eventBus;
		this.bufferSize = bufferSize;
		this.linesByRoom = new Map();
	}

	appendLine(line: StreamLineRecord): void {
		const roomName = getProcessStreamRoomName(line.agent_id, line.process_id);
		const existingLines = this.linesByRoom.get(roomName) ?? [];
		const nextLines = [...existingLines, line];

		if (nextLines.length > this.bufferSize) {
			nextLines.splice(0, nextLines.length - this.bufferSize);
		}

		this.linesByRoom.set(roomName, nextLines);

		const lineEvent = new StreamLineEvent({
			name: MonitorEventName.StreamLine,
			body: {
				room: roomName,
				line,
			},
		});

		this.eventBus.emitTo(roomName, lineEvent);
	}

	clear(agentId: string, processId: string): void {
		const roomName = getProcessStreamRoomName(agentId, processId);
		this.linesByRoom.delete(roomName);

		const clearEvent = new StreamClearEvent({
			name: MonitorEventName.StreamClear,
			body: {
				room: roomName,
			},
		});

		this.eventBus.emitTo(roomName, clearEvent);
	}

	getSnapshot(roomName: string): StreamSnapshotEvent {
		const lines = this.linesByRoom.get(roomName) ?? [];

		return new StreamSnapshotEvent({
			name: MonitorEventName.StreamSnapshot,
			body: {
				room: roomName,
				lines,
			},
		});
	}

	getLines(agentId: string, processId: string): StreamLineRecord[] {
		const roomName = getProcessStreamRoomName(agentId, processId);
		const lines = this.linesByRoom.get(roomName) ?? [];

		return lines.map((line) => new StreamLineRecord(line));
	}
}
