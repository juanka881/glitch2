import { io, type Socket } from 'socket.io-client';
import {
	getProcessStreamRoomName,
	MonitorEventName,
	StreamClearEvent,
	StreamLineEvent,
	StreamSnapshotEvent,
} from '#src/shared/events/monitor-event-shapes';

export type SnapshotCallback = (event: StreamSnapshotEvent) => void;

export type LineCallback = (event: StreamLineEvent) => void;

export type ClearCallback = (event: StreamClearEvent) => void;

export type MonitorEventCallback = (...args: never[]) => unknown;

export class MonitorEventSource {
	private readonly socket: Socket;
	private readonly wrappers: Map<MonitorEventCallback, (fields: unknown) => void>;

	constructor(socket: Socket) {
		this.socket = socket;
		this.wrappers = new Map();
	}

	subscribeToProcess(agentId: string, processId: string): void {
		const roomName = getProcessStreamRoomName(agentId, processId);

		this.socket.emit('subscribe', {
			rooms: [roomName],
		});
	}

	unsubscribeFromProcess(agentId: string, processId: string): void {
		const roomName = getProcessStreamRoomName(agentId, processId);

		this.socket.emit('unsubscribe', {
			rooms: [roomName],
		});
	}

	onSnapshot(callback: SnapshotCallback): () => void {
		const wrapper = (fields: unknown) => {
			const event = new StreamSnapshotEvent(fields);
			callback(event);
		};

		this.wrappers.set(callback, wrapper);
		this.socket.on(MonitorEventName.StreamSnapshot, wrapper);
		return () => this.offSnapshot(callback);
	}

	offSnapshot(callback: SnapshotCallback): void {
		this.offEvent(MonitorEventName.StreamSnapshot, callback);
	}

	onLine(callback: LineCallback): () => void {
		const wrapper = (fields: unknown) => {
			const event = new StreamLineEvent(fields);
			callback(event);
		};

		this.wrappers.set(callback, wrapper);
		this.socket.on(MonitorEventName.StreamLine, wrapper);
		return () => this.offLine(callback);
	}

	offLine(callback: LineCallback): void {
		this.offEvent(MonitorEventName.StreamLine, callback);
	}

	onClear(callback: ClearCallback): () => void {
		const wrapper = (fields: unknown) => {
			const event = new StreamClearEvent(fields);
			callback(event);
		};

		this.wrappers.set(callback, wrapper);
		this.socket.on(MonitorEventName.StreamClear, wrapper);
		return () => this.offClear(callback);
	}

	offClear(callback: ClearCallback): void {
		this.offEvent(MonitorEventName.StreamClear, callback);
	}

	private offEvent(eventName: MonitorEventName, callback: MonitorEventCallback): void {
		const wrapper = this.wrappers.get(callback);

		if (!wrapper) {
			return;
		}

		this.socket.off(eventName, wrapper);
		this.wrappers.delete(callback);
	}
}

export function createMonitorSocket(baseUrl?: string): Socket {
	return io(baseUrl ?? undefined, {
		path: '/api/event',
		autoConnect: true,
	});
}

export function createMonitorEventSource(baseUrl?: string): MonitorEventSource {
	const socket = createMonitorSocket(baseUrl);
	return new MonitorEventSource(socket);
}

export const monitorEventSource = createMonitorEventSource();
