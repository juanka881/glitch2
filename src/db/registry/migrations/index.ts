import { registryMigration } from '#src/db/registry/migrations/20260301-registry';
import type { Migration } from '#src/db/migration';

export const migrations: Migration[] = [registryMigration];
