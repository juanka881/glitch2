import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { ShutdownManager } from '#src/shared/utils/shutdown-manager';

test('ShutdownManager runs cleanup steps and exits with the provided code', async () => {
	const steps: string[] = [];
	let exitCode = -1;
	let exitReason = '';

	const shutdownManager = new ShutdownManager(50);
	shutdownManager.setExitCallback((context) => {
		exitCode = context.code;
		exitReason = context.reason;
	});
	shutdownManager.register('first', (context) => {
		steps.push(context.reason);
		steps.push('first');
	});
	shutdownManager.register('second', () => {
		steps.push('second');
	});

	await shutdownManager.shutdown(42, 'test');

	assert.deepEqual(steps, ['second', 'test', 'first'], 'shutdown steps must run in reverse registration order');
	assert(exitCode === 42, 'shutdown manager must forward the exit code');
	assert(exitReason === 'test', 'shutdown manager must forward the shutdown reason');
});

test('ShutdownManager continues after a timed out step', async () => {
	const steps: string[] = [];
	let exitCode = -1;
	let exitError: unknown = null;

	const shutdownManager = new ShutdownManager(10);
	shutdownManager.setExitCallback((context) => {
		exitCode = context.code;
		exitError = context.error ?? null;
	});
	shutdownManager.register('slow', async () => {
		steps.push('slow:start');
		await Bun.sleep(25);
		steps.push('slow:end');
	});
	shutdownManager.register('fast', () => {
		steps.push('fast');
	});

	await shutdownManager.shutdown(7, 'timeout');

	assert(steps.includes('fast'), 'shutdown manager must continue to later steps after a timeout');
	assert(exitCode === 7, 'shutdown manager must still exit after a timeout');
	assert(exitError === null, 'shutdown manager must preserve the provided error context');
});

test('ShutdownManager forwards the provided error to callbacks and exit handling', async () => {
	const error = new Error('boom');
	let callbackError: unknown = null;
	let exitError: unknown = null;

	const shutdownManager = new ShutdownManager(50);
	shutdownManager.register('capture error', (context) => {
		callbackError = context.error ?? null;
	});
	shutdownManager.setExitCallback((context) => {
		exitError = context.error ?? null;
	});

	await shutdownManager.shutdown(1, 'failure', error);

	assert(callbackError === error, 'shutdown callbacks must receive the provided error');
	assert(exitError === error, 'shutdown exit callback must receive the provided error');
});
