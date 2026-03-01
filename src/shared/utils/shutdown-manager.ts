import { getLogger, type Logger } from '@logtape/logtape';

export type ShutdownCallback = (() => Promise<void>) | (() => void);
export type ShutdownExitCallback = (code: number) => void;

export interface ShutdownStep {
	name: string;
	callback: ShutdownCallback;
}

export class ShutdownManager {
	private readonly steps: ShutdownStep[];
	private readonly log: Logger;

	private shutdownPromise?: Promise<void>;
	private exitCallback: ShutdownExitCallback;

	constructor() {
		this.steps = [];
		this.log = getLogger(['glitch', 'shutdown']);
		this.exitCallback = () => {};
	}

	setExitCallback(callback: ShutdownExitCallback) {
		this.exitCallback = callback;
	}

	register(name: string, callback: ShutdownCallback): void {
		this.steps.push({ name, callback });
	}

	get isShuttingDown(): boolean {
		return this.shutdownPromise !== undefined;
	}

	async shutdown(code: number, reason: string): Promise<void> {
		if (this.shutdownPromise) {
			return this.shutdownPromise;
		}

		this.log.info(`shutdown: ${reason} (${code})`);

		const shutdownPromise = this.shutdownInternal(code);
		this.shutdownPromise = shutdownPromise;

		return shutdownPromise;
	}

	private async shutdownInternal(code: number): Promise<void> {
		const steps = this.steps.slice().reverse();

		this.log.debug(`running shutdown steps[${steps.length}]`);

		for (const [index, step] of steps.entries()) {
			try {
				this.log.debug(`run: ${step.name} [${index + 1}/${steps.length}]`);
				await step.callback();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.log.error(`step error: ${message}`, { error });
			}
		}

		this.log.debug(`shutdown complete exit=${code}`);
		this.exitCallback(code);
	}
}
