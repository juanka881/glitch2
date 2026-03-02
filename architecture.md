# Architecture

## Purpose

This file captures repo-wide architectural conventions that should stay stable across feature work, agent iterations, and future contributors.

## Core Components

Glitch is split into two primary components:

- `agent`: a local CLI that runs project processes, captures monitoring data, and stores it in a per-project SQLite database
- `monitor`: a local host process that serves the UI, works with the registry, and bridges live and historical data
- `ui`: a SolidJS SPA that talks only to the monitor

## Agent Code Layout

Agent code should live under `src/agent`.

Expected structure:

- `src/agent/main.ts`
  - entry point for the agent
- `src/agent/boot/*`
  - startup and bootstrapping logic
- `src/agent/app/<feature>/*`
  - one folder per feature or module

Examples:

- `src/agent/app/supervisor`
- `src/agent/app/logger`

## Monitor Code Layout

Monitor code should live under `src/monitor`.

Expected structure:

- `src/monitor/main.ts`
  - entry point for the monitor
- `src/monitor/boot/*`
  - startup and bootstrapping logic
- `src/monitor/app/<feature>/*`
  - one folder per monitor feature or module

Examples:

- `src/monitor/app/monitor`

Rules:

- `main.ts` should stay thin and only dispatch commands or boot the runtime
- when a runtime supports multiple commands, split the command handlers into separate functions or supporting files instead of stuffing all behavior into `main.ts`

## Runtime Feature Module Layout

Each feature folder under `src/<runtime>/app/<feature>` should follow the same internal structure.

Expected files:

- `<feature>-repo.ts`
  - all data access for the feature
- `<feature>-service.ts`
  - high-level feature API such as `new SupervisorService()` or `supervisor.startProcess()`
- `<feature>-shapes.ts`
  - feature-local types, enums, and data or record classes

Rules:

- the service uses the repo for all persistence and retrieval
- the service should never talk to SQLite directly
- the repo is the only feature-local layer that talks to the shared database client

## Future HTTP Layout

There is no API implementation yet, but if a feature exposes HTTP endpoints later it should use:

- `src/<runtime>/app/<feature>/http/router.ts`
- `src/<runtime>/app/<feature>/http/<feature>-http-shapes.ts`

Rules:

- module shapes and API shapes should be separate
- internal feature shapes must not be reused as public API transport shapes
- API `<feature>-http-shapes.ts` is only for request and response contracts
- this applies to both `src/agent/*` and `src/monitor/*`

## Database Layout

Database code should live under `src/db`.

Expected structure:

- `src/db/client.ts`
  - shared SQLite client wrapper
- `src/db/migration.ts`
  - shared migration runner
- `src/db/agent/*`
  - per-project agent database migrations and models
- `src/db/registry/*`
  - registry database migrations and models

On boot, the agent and monitor should initialize the database(s) they need through this layer and apply migrations before feature services start running.

## Shared Runtime Helpers

Cross-runtime helpers that are not specific to a single feature should live under `src/shared`.

Examples:

- `src/shared/utils/glitch-home.ts`
- `src/shared/utils/base-url.ts`
- `src/shared/utils/shutdown-manager.ts`
- `src/shared/registry/registry-repo.ts`
- `src/shared/registry/registry-service.ts`
- `src/shared/build.ts`

Build metadata rules:

- shared build metadata helpers should live under `src/shared/build.ts`
- binaries should read version and commit from build-time constants such as `BUILD_VERSION` and `BUILD_COMMIT`
- runtime code should not read `package.json` directly to determine binary version metadata
- runtime-specific process helpers should stay in the owning runtime module, not in shared code, unless they are truly generic across runtimes

## Migration Rules

Each migration should expose two functions:

- `apply`
- `revert`

Rules:

- `apply` creates or updates the desired SQLite objects
- `revert` undoes the migration changes
- all migrations must run inside a transaction
- all migrations must be idempotent
- rerunning a migration must not fail if the database objects already exist
- `migration.ts` should stay simple and only coordinate ordering, transactions, and execution

## Models and Validation

Each table should have a corresponding model class under the appropriate shared database folder.

Rules:

- repos should return model instances instead of untyped raw rows
- the rest of the code should work with these model classes as strongly typed objects
- every data class or record class should have a matching Zod v4 schema
- construction should validate unknown input at runtime before assignment
- agent database models live under `src/db/agent/models/*`
- registry database models live under `src/db/registry/models/*`

Recommended constructor pattern:

```ts
class ExampleRecord {
	static schema = z.object({
		id: z.string(),
	});

	id!: string;

	constructor(fields: unknown) {
		const parsed = ExampleRecord.schema.parse(fields);
		Object.assign(this, parsed);
	}
}
```

This keeps object creation strict and ensures all constructed records have valid data.

## Cross-Feature Code Conventions

Use the same basic conventions across all runtime features unless a specific feature has a strong reason to differ.

These conventions apply to both agent and monitor code unless a runtime-specific rule is documented explicitly.

### Naming

- use `PascalCase` for classes
- use `camelCase` for methods, variables, and local functions
- use `snake_case` only for JSON payload fields, database column names, and DTO or model properties that mirror persisted contract names
- prefer singular class names such as `SupervisorService`, `LoggerRepo`, and `AgentRunModel`
- prefer equivalent naming in monitor code such as `RegistryService`, `MonitorServerService`, and `RegistryAgentModel`
- when there are two or more variables of the same kind in scope, use consistent descriptive names such as `agentMigrator` and `registryMigrator` instead of mixing a generic name with a specific one
- group related lines together and use blank lines to separate distinct phases of logic

### Imports

- keep imports grouped by runtime dependency first, then local project imports
- keep import blocks compact with no extra blank lines between import statements
- order imports as built-in runtime imports first, then package imports, then project imports
- for Node built-ins, prefer namespace-style imports such as `import path from 'node:path'` and `import fsp from 'node:fs/promises'`
- use package subpath imports such as `#src/...` and `#test/...` instead of deep relative paths like `../../..`
- avoid circular imports between services, repos, models, and shapes
- feature modules should depend downward on shared/db code, not sideways on another feature's internals
- prefer named exports in application code; avoid default exports

### Services

- default to service classes for feature entrypoints
- a service should expose the high-level behavior of the feature
- a service may coordinate repos, models, and other infrastructure dependencies
- a service should not embed raw SQL or direct database access
- when a service depends on runtime infrastructure such as process spawning, filesystem coordination, or transport behavior, prefer an interface-backed dependency instead of passing loose functions
- prefer logger-based output through `getLogger()` and LogTape for application logging; use `console.log(...)` only when intentionally writing directly to the console surface
- declare class properties with the other fields and assign them in the constructor
- avoid constructor parameter properties such as `constructor(private readonly repo: Repo) {}`
- avoid inline collection or object initializers for class state; initialize them in the constructor instead
- if graceful shutdown behavior is reusable, place it under `src/shared/utils` instead of embedding it in a single runtime entrypoint
- keep platform-specific concerns such as process spawning, browser launch, or PID checks behind interface-backed helpers instead of mixing them directly into orchestration services

### Repos

- repos are responsible for persistence and retrieval only
- repos should accept a db client or transaction dependency explicitly
- repos should return validated models or feature shapes, not loose row objects

### Shapes and Models

- `<feature>-shapes.ts` is for feature-local domain types, enums, and record classes
- `db/models/*` is for table-backed persisted models
- keep transport-specific API shapes separate from internal shapes
- when a concept exists both in persistence and in transport, define separate classes or schemas for each layer
- use TypeScript `enum` for closed enum sets and pass the enum into `z.enum(...)` when defining schemas

### Function Style

- prefer explicit inputs over defaulting runtime values in the parameter list for boot or environment-dependent functions
- for example, prefer `bootstrapAgent(cwd: string)` and let the caller pass `process.cwd()`
- keep boot functions focused on constructing runtime dependencies; avoid hidden domain-side side effects such as creating registry rows during bootstrap
- exported functions and public methods should declare explicit return types instead of relying on inference
- prefer built-in platform types directly when they already exist; do not reach for `ReturnType<...>` when the runtime or standard library already provides a clearer type
- avoid dense inline transformations that are hard to scan
- when a mapping or conversion has real logic, assign it to a local variable before returning
- avoid reconstructing the same object shape just to pass it into a constructor again
- when a callsite becomes hard to scan, break it into intermediate variables instead of nesting transformations inline
- prefer extracting non-trivial event payloads into named variables before passing them into `emit(...)`
- do not introduce artificial forever-waits such as unresolved promises just to keep a runtime alive; if the server or timer keeps the process alive naturally, return after setup
- avoid unconditional endless loops when a real runtime condition already exists; prefer loops such as `while (isAlive)` and keep timeout checks inside the loop body
- if runtime structure or lifecycle behavior is unclear, stop and ask instead of inventing control-flow on a hunch
- use `Promise.allSettled(...)` by default when coordinating multiple async operations that should all be awaited; use `Promise.all(...)` only for special cases
- keep cleanup orchestration separate from state transitions; reusable shutdown helpers should manage cleanup steps, while runtime entrypoints should decide whether the final persisted state is `exit`, `fail`, or another terminal state

## Testing Conventions

Testing should validate both runtime shape safety and persistence behavior.

### Data Classes and Record Classes

For every data class or record class:

- add one positive test that successfully constructs the class from valid input
- add one negative test that fails construction when the input is invalid

This ensures the matching Zod schema is correct and that constructed objects are sound.

### Repo Classes

For every public repo method:

- add a corresponding test that exercises that method
- cover read methods such as `get`, `find`, or list queries
- cover write methods such as `insert`, `update`, and delete-like operations if they exist

Repo tests may set up state directly with SQL where that is the simplest way to create the required preconditions.

### Database Test Setup

Use SQLite in-memory databases for repo tests whenever possible.

Rules:

- use SQLite's in-memory mode to avoid temporary file cleanup
- run the migrator before each test to create the required schema
- keep repo tests isolated so each test gets its own database state
- use direct SQL setup sparingly and only to create the exact state needed for the repo method under test

### Test Style

Use Bun's `test` function for tests.

Rules:

- name test files after the source file they cover, for example `supervisor-service.test.ts` or `registry-service.test.ts`
- prefer flat tests and avoid nesting or grouping unless it is genuinely necessary
- the test file already acts as the natural grouping boundary in most cases
- use `assert` style assertions instead of `expect`
- prefer explicit assertion messages when the failure would otherwise be unclear

Examples:

```ts
assert(value === 42, 'value must be 42');
```

Do not prefer:

```ts
expect(value).toBe(42);
```

### Test Structure

Follow the AAA pattern whenever possible:

- assemble
  - create the isolated system under test and required state
- act
  - perform the behavior being tested
- assert
  - verify the resulting properties and expected contract

Keep this structure visually obvious in the test body so tests stay easy to scan and maintain.

## Storage Model

- Project telemetry data lives in `<project_root>/.glitch/agent.glitch`
- Global discovery data and shared settings live in `<home>/.glitch/`
- The registry database lives at `<home>/.glitch/registry.glitch`
- Monitor lock ownership lives at `<home>/.glitch/monitor.lock`
- Monitor state metadata lives at `<home>/.glitch/monitor.state.json`
- The home directory stores discovery state and monitor metadata, not the primary project telemetry dataset

Current project id rule:

- create the project id on first registry insertion for the project
- look up the existing project by `cwd_hash` and reuse its id on future runs
- use UUIDv7 for project ids and other new ids
- use the `uuid` package `v7()` implementation for UUIDv7 generation
- code that works with the Glitch home directory should accept it as an explicit input when practical so tests can override the default `<home>/.glitch` location with a temporary directory

## Data Contract Conventions

All JSON data in Glitch should use `snake_case`.

This applies to:

- `glitch.config.json`
- files stored under `<home>/.glitch/`
- API request and response payloads
- WebSocket event payloads
- any JSON examples written in feature docs

For date and timestamp fields, use the `name_date` pattern.

For event names, use the `noun.verb` pattern in present/base form rather than past tense.

Examples:

- use `project_name`, not `projectName`
- use `start_date`, not `started_at`
- use `end_date`, not `ended_at`
- use `last_ping_date`, not `lastPingDate`
- use `api_base_url`, not `apiBaseUrl`
- use `process.start`, not `process.started`
- use `process.exit`, not `process.exited`

This convention exists so persisted metadata, config files, and wire payloads all follow one predictable shape regardless of whether the consumer is the agent, the UI, or a future external tool.

## Documentation Placeholder Style

When documenting paths, URLs, or derived values, use angle brackets for placeholders.

Examples:

- `<project_root>/.glitch/agent.glitch`
- `<home>/.glitch/registry.glitch`
- `<base_url>/stream`

Do not mix template-string notation such as `${base_url}/stream` into architecture or feature docs.

## Schema Definition Format

When documenting tables or structured contracts, use a compact notation that includes:

- field name
- logical type
- SQLite physical storage type when the field is persisted
- optional foreign-key reference when applicable

Format:

- ``field_name logical_type (sqlite_type)``
- ``field_name? logical_type (sqlite_type)``
- ``field_name logical_type (sqlite_type) references other_table.id``

Rules:

- use `?` on the field name to mark optional or nullable fields
- use logical types such as `uuid`, `datetime`, `string`, `json`, `process_status`, or `process_stream`
- when documenting SQLite-backed schemas, always include the physical storage type in parentheses
- when documenting non-persisted event payloads or in-memory contracts, omit the SQLite type and list only the logical type

Examples:

- `id uuid (text)`
- `end_date? datetime (text)`
- `agent_run_id uuid (text) references agent_runs.id`
- `status process_status (text)`
- `stream process_stream (text)`

## Documentation Rule

When adding or updating feature docs, keep architectural examples aligned with this file. If a feature needs a different convention for a strong reason, document the exception explicitly in both the feature file and this file.
