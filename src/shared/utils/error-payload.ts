export interface ErrorPayload {
	name?: string;
	message: string;
	stack?: string | null;
}

export function toErrorPayload(error: unknown): ErrorPayload {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack ?? null,
		};
	}

	return {
		message: String(error),
	};
}
