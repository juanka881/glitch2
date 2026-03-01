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

- `src/monitor/app/registry`
- `src/monitor/app/server`

## Runtime Feature Module Layout

Each feature folder under `src/<runtime>/app/<feature>` should follow the same internal structure.

Expected files:

- `repo.ts`
  - all data access for the feature
- `service.ts`
  - high-level feature API such as `new SupervisorService()` or `supervisor.startProcess()`
- `shapes.ts`
  - feature-local types, enums, and data or record classes

Rules:

- the service uses the repo for all persistence and retrieval
- the service should never talk to SQLite directly
- the repo is the only feature-local layer that talks to the shared database client

## Future HTTP Layout

There is no API implementation yet, but if a feature exposes HTTP endpoints later it should use:

- `src/<runtime>/app/<feature>/http/router.ts`
- `src/<runtime>/app/<feature>/http/shapes.ts`

Rules:

- module shapes and API shapes should be separate
- internal feature shapes must not be reused as public API transport shapes
- API `shapes.ts` is only for request and response contracts
- this applies to both `src/agent/*` and `src/monitor/*`

## Database Layout

Database code should live under `src/db`.

Expected structure:

- `src/db/agent/*`
  - per-project agent database client, migrations, and models
- `src/db/registry/*`
  - registry database client, migrations, and models

On boot, the agent and monitor should initialize the database(s) they need through this layer and apply migrations before feature services start running.

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

### Imports

- prefer explicit named imports over namespace imports
- keep imports grouped by runtime dependency first, then local project imports
- keep import blocks compact with no extra blank lines between import statements
- order imports as built-in runtime imports first, then package imports, then project imports
- use package subpath imports such as `#src/...` and `#test/...` instead of deep relative paths like `../../..`
- avoid circular imports between services, repos, models, and shapes
- feature modules should depend downward on shared/db code, not sideways on another feature's internals

### Services

- default to service classes for feature entrypoints
- a service should expose the high-level behavior of the feature
- a service may coordinate repos, models, and other infrastructure dependencies
- a service should not embed raw SQL or direct database access
- when a service depends on runtime infrastructure such as process spawning, filesystem coordination, or transport behavior, prefer an interface-backed dependency instead of passing loose functions
- declare class properties with the other fields and assign them in the constructor
- avoid constructor parameter properties such as `constructor(private readonly repo: Repo) {}`
- avoid inline collection or object initializers for class state; initialize them in the constructor instead

### Repos

- repos are responsible for persistence and retrieval only
- repos should accept a db client or transaction dependency explicitly
- repos should return validated models or feature shapes, not loose row objects

### Shapes and Models

- `shapes.ts` is for feature-local domain types, enums, and record classes
- `db/models/*` is for table-backed persisted models
- keep transport-specific API shapes separate from internal shapes
- when a concept exists both in persistence and in transport, define separate classes or schemas for each layer
- use TypeScript `enum` for closed enum sets and pass the enum into `z.enum(...)` when defining schemas

### Function Style

- prefer explicit inputs over defaulting runtime values in the parameter list for boot or environment-dependent functions
- for example, prefer `bootstrapAgent(cwd: string)` and let the caller pass `process.cwd()`
- avoid dense inline transformations that are hard to scan
- when a mapping or conversion has real logic, assign it to a local variable before returning
- avoid reconstructing the same object shape just to pass it into a constructor again

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
- The project id currently lives at `<project_root>/.glitch/id`
- Global discovery data and shared settings live in `<home>/.glitch/`
- The registry database lives at `<home>/.glitch/registry.glitch`
- The home directory stores discovery state and monitor metadata, not the primary project telemetry dataset

Current project id rule:

- create the project id on first run if `<project_root>/.glitch/id` does not exist
- persist it to that file and reuse it on future runs
- use UUIDv7 for project ids and other new ids
- use the `uuid` package `v7()` implementation for UUIDv7 generation
- this is a temporary local-only mechanism until project identity is also managed from the shared registry
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
- use `last_seen_date`, not `lastSeenAt`
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
