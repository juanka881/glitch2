import { Database, type SQLQueryBindings } from 'bun:sqlite';

export type SqlParams = Record<string, SQLQueryBindings> | SQLQueryBindings[];

export class DbClient {
	readonly sqlite: Database;

	constructor(sqlite: Database) {
		this.sqlite = sqlite;
	}

	static open(path: string) {
		return new DbClient(new Database(path, { create: true, strict: true }));
	}

	static memory() {
		return new DbClient(new Database(':memory:', { create: true, strict: true }));
	}

	run(sql: string, params?: SqlParams) {
		const statement = this.sqlite.query(sql);

		if (params === undefined) {
			return statement.run();
		}

		if (Array.isArray(params)) {
			return statement.run(...params);
		}

		return statement.run(params as never);
	}

	get<T>(sql: string, params?: SqlParams) {
		const statement = this.sqlite.query(sql);

		if (params === undefined) {
			return (statement.get() as T | null) ?? null;
		}

		if (Array.isArray(params)) {
			return (statement.get(...params) as T | null) ?? null;
		}

		return (statement.get(params as never) as T | null) ?? null;
	}

	all<T>(sql: string, params?: SqlParams) {
		const statement = this.sqlite.query(sql);

		if (params === undefined) {
			return (statement.all() as T[]) ?? [];
		}

		if (Array.isArray(params)) {
			return (statement.all(...params) as T[]) ?? [];
		}

		return (statement.all(params as never) as T[]) ?? [];
	}

	transaction<T>(callback: () => T) {
		return this.sqlite.transaction(callback)();
	}

	close() {
		this.sqlite.close(false);
	}
}
