import { getLogger, type Logger } from '@logtape/logtape';

export const SHUTDOWN_TIMEOUT_MS = 5_000;

export interface ShutdownContext {
	code: number;
	reason: string;
	error?: unknown;
}

export type ShutdownCallback = ((context: ShutdownContext) => Promise<void>) | ((context: ShutdownContext) => void);
export type ShutdownExitCallback = (context: ShutdownContext) => void;

export interface ShutdownStep {
	name: string;
	callback: ShutdownCallback;
}

export class ShutdownManager {
	private readonly steps: ShutdownStep[];
	private readonly log: Logger;
	private readonly stepTimeoutMs: number;

	private shutdownPromise?: Promise<void>;
	private exitCallback: ShutdownExitCallback;

	constructor(timeoutMs = SHUTDOWN_TIMEOUT_MS) {
		this.steps = [];
		this.log = getLogger(['glitch', 'shutdown']);
		this.stepTimeoutMs = timeoutMs;
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

	async shutdown(code: number, reason: string, error?: unknown): Promise<void> {
		if (this.shutdownPromise) {
			return this.shutdownPromise;
		}

		this.log.info(`shutdown: ${reason} (${code})`);

		const context: ShutdownContext = { code, reason, error };
		const shutdownPromise = this.shutdownInternal(context);
		this.shutdownPromise = shutdownPromise;

		return shutdownPromise;
	}

	private async shutdownInternal(context: ShutdownContext): Promise<void> {
		const steps = this.steps.slice().reverse();

		this.log.debug(`running shutdown steps[${steps.length}]`);

		for (const [index, step] of steps.entries()) {
			try {
				this.log.debug(`run: ${step.name} [${index + 1}/${steps.length}]`);
				await this.runStep(step, context);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.log.error(`step error: ${message}`, { error });
			}
		}

		this.log.debug(`shutdown complete exit=${context.code}`);
		this.exitCallback(context);
	}

	private async runStep(step: ShutdownStep, context: ShutdownContext): Promise<void> {
		let timeoutId: NodeJS.Timeout | null = null;
		const timeoutPromise = new Promise<never>((_, reject) => {
			const timeoutError = new Error(`Shutdown step timeout: ${step.name}`);

			timeoutId = setTimeout(() => reject(timeoutError), this.stepTimeoutMs);
		});

		try {
			await Promise.race([Promise.resolve(step.callback(context)), timeoutPromise]);
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	}
}
