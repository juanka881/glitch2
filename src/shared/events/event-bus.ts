import type { Server as SocketServer, Socket } from 'socket.io';
import { type EventMessage, SubscribeInput, UnsubscribeInput } from '#src/shared/events/monitor-event-shapes';

export class EventBus {
	private readonly io: SocketServer;

	constructor(io: SocketServer) {
		this.io = io;
	}

	bind(): void {
		this.io.on('connection', (socket) => {
			this.bindSocket(socket);
		});
	}

	emit(event: EventMessage): void {
		this.io.emit(event.name, event);
	}

	emitTo(roomName: string, event: EventMessage): void {
		this.io.to(roomName).emit(event.name, event);
	}

	private bindSocket(socket: Socket): void {
		socket.on('subscribe', (fields: unknown) => {
			const input = new SubscribeInput(fields);

			for (const room of input.rooms) {
				void socket.join(room);
			}
		});

		socket.on('unsubscribe', (fields: unknown) => {
			const input = new UnsubscribeInput(fields);

			for (const room of input.rooms) {
				void socket.leave(room);
			}
		});
	}
}
