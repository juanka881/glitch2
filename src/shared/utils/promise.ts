export async function wait(delayMs: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, delayMs);
	});
}
