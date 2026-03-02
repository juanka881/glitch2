# Discovery and Registry

Status: `implemented`

## Problem

The UI needs a stable way to discover:

- known projects
- active agents
- historical agent runs across all projects
- the local monitor process that serves the UI

Without a shared discovery layer, the user would need to manually provide project paths or active endpoints every time.

## Goals

- keep project telemetry in a per-project SQLite database
- keep discovery metadata in a separate registry SQLite database
- let the UI show a global view of known projects and agents
- let the UI connect directly to a live agent when available
- let the UI fall back to the per-project database for historical data
- support a long-running local monitor process for UI hosting and registry cleanup

## Implementation Status

This feature is implemented in the current codebase.

Shipped scope:

- per-project telemetry now uses `<project_root>/.glitch/agent.glitch`
- the shared registry database now lives at `<glitch_home>/registry.glitch`
- agent boot registers projects and agents in the registry database
- agent lifecycle updates the registry on start, running, ping, fail, and exit
- registry rows persist `end_date` and `error`
- project rows persist `add_date`, `last_ping_date`, and `latest_agent_id`
- registry schema and models live under `src/db/registry/*`
- shared registry repo and service live under `src/shared/registry/*`
- shared runtime utilities live under `src/shared/utils/*`
- shared database helpers live under `src/db/*`
- the monitor shell now lives under `src/monitor/*`
- `glw serve` runs a minimal placeholder HTTP host and periodic stale-agent cleanup
- `glw`, `glw status`, and `glw stop` manage monitor startup and metadata through `monitor.lock.json`

Current limitations:

- the agent still advertises a `base_url` before a real agent API exists
- the monitor currently serves a placeholder HTTP response instead of the future embedded UI bundle
- idle self-termination for the monitor is still deferred

## Non-Goals

- remote multi-user coordination
- cross-machine registry sharing
- authentication or authorization in v1
- monitor self-termination in this phase

## Core Decision

Glitch should use two databases:

- per-project telemetry database
- global registry database

Per-project telemetry remains local to the project. Discovery metadata is centralized under the user's home directory.

## Naming

Database filenames:

- per-project agent database: `agent.glitch`
- global registry database: `registry.glitch`

Recommended UI host name:

- product name: `monitor`
- binary name: `glw`

This keeps the pair readable:

- `glx` starts the agent
- `glw` starts or reuses the monitor and opens the UI

## Directory Layout

Global directory:

`<home>/.glitch/`

Suggested contents:

- `registry.glitch`
- `monitor.lock.json`
- `settings.json`

Project-local contents:

- `<project_root>/.glitch/agent.glitch`

## Shared Database Layout

The codebase should support two database implementations under a shared top-level database folder:

- `src/db/client.ts`
- `src/db/migration.ts`
- `src/db/agent/*`
- `src/db/registry/*`

The previous `src/agent/db/*` implementation has been moved into the shared `src/db/*` layout.

Reason:

- the agent and monitor will both need access to the same database classes
- this keeps migrations, models, and repos consistent across processes
- it avoids duplicating registry logic inside the monitor later

## Registry Schema

The registry database should follow the same pattern as the agent database:

- dedicated client
- dedicated migrations
- dedicated models
- migrations applied on startup

### `projects`

Stores all known projects on the current machine.

Columns:

- `id` uuid (text)
- `name` string (text)
- `cwd` path (text)
- `cwd_hash` string (text)
- `add_date` datetime (text)
- `last_ping_date` datetime (text)
- `latest_agent_id?` uuid (text)

Notes:

- a project row should be created on first agent startup for that project
- if the project already exists, the row should be updated
- the project id is created when the row is first inserted and then reused through `cwd_hash`
- `add_date` records when the project was first seen by Glitch and does not change afterward
- `last_ping_date` should be set when the project is first added and updated on every agent ping
- `latest_agent_id` remains null until an agent reaches `running`
- `cwd_hash` should be derived from the normalized lowercase cwd to handle case-insensitive path matching
- `cwd_hash` should use SHA-256 and be stored as an uppercase hexadecimal string
- `cwd_hash` should be unique
- the project agent database path is derived, not stored
- the derived agent database path is `<cwd>/.glitch/agent.glitch`

### `agents`

Stores known agents across all projects, both current and historical.

Columns:

- `id` uuid (text)
- `project_id` uuid (text) references `projects.id`
- `cwd` path (text)
- `pid` integer (integer)
- `start_date` datetime (text)
- `end_date?` datetime (text)
- `ping_date` datetime (text)
- `base_url` string (text)
- `status` registry_agent_status (text)
- `error?` json (text)

Notes:

- each `glx` run creates one agent row
- the row is updated while the agent is alive
- on clean shutdown the final status must be `exit`
- on failure the registry row should also persist the final structured error payload
- if an agent disappears without a clean shutdown, the monitor will later mark it as `crash`
- API and WebSocket URLs are derived from `base_url`

## Enumerations

### `registry_agent_status`

- `start`
- `running`
- `fail`
- `exit`
- `crash`

## Derived Endpoints

Given `base_url`, the rest of the live endpoints are derived:

- API root: `base_url`
- WebSocket stream: `<base_url>/stream`
- historical project database: `<cwd>/.glitch/agent.glitch`

The registry should not persist redundant derived fields.

## Agent Lifecycle

Each agent should pick a random localhost port in the range `18000` to `28000`.

Suggested startup flow:

1. bootstrap the agent
2. load project config
3. ensure the project agent database exists at `<project_root>/.glitch/agent.glitch`
4. ensure the home registry exists at `<home>/.glitch/registry.glitch`
5. run registry migrations if needed
6. insert or update the `projects` row and resolve the project id from it
7. set `last_ping_date`
8. insert the `agents` row with `status = start`
9. start the local API on `http://127.0.0.1:<port>`
10. update the `agents` row with `status = running`
11. update `latest_agent_id`
12. update `ping_date` every 30 seconds while alive
13. update `projects.last_ping_date` on every agent ping

Shutdown flow:

1. shut down supervised child processes
2. stop the ping timer before registry shutdown updates begin
3. finalize the per-project `agent_runs` row
4. update the registry `agents` row to `status = exit`
5. write `end_date`
6. clear or preserve `error` depending on the final state

Failure flow:

1. set per-project `agent_runs.status = fail`
2. persist the per-project failure payload
3. update the registry `agents.status = fail`
4. persist the same structured error payload into `registry.agents.error`
5. write `end_date`
6. stop the ping timer before registry shutdown updates begin
7. attempt normal shutdown
8. if the process is killed before metadata is flushed, the monitor cleanup pass will eventually mark the row as `crash`

## Ping Model

While running, the agent should update its registry row every 30 seconds.

This ping is not the primary liveness signal for the live UI. The live UI will already know immediately when the WebSocket connection drops.

The ping exists as a secondary liveness and discovery update.

The ping timer must be stopped before shutdown state transitions begin so it cannot write stale `running` updates during shutdown.

## Monitor Responsibilities

The UI should not talk directly to agent processes or databases. The UI should only talk to the local monitor process.

Recommended monitor name:

- internal role: `monitor`
- binary: `glw`

Responsibilities:

- host the UI
- expose UI-facing endpoints
- read from the registry database
- connect to live agents when they are available
- read historical project data from per-project agent databases when agents are offline
- run periodic registry cleanup for stale agent rows

For this phase, the monitor is still only a shell. The future web UI bundle will eventually be built and embedded into the monitor binary so it can be served directly from memory.

## Monitor Lifecycle

`glw` command behavior:

- `glw`
  - start or reuse a background monitor instance
  - open a browser tab to the monitor URL
- `glw serve`
  - run the monitor host process directly
- `glw status`
  - print whether the monitor is running and its pid
- `glw stop`
  - stop the background monitor process

Monitor bootstrap behavior:

1. check `<home>/.glitch/monitor.lock.json`
2. if the recorded pid exists, reuse that monitor
3. if it is alive, open a browser to its recorded URL
4. if it is not alive, start `glw serve`
5. the serving monitor acquires `monitor.lock.json` with exclusive access and writes its pid and port

The self-termination behavior after one minute of inactivity is deferred for later.

## Monitor Cleanup Job

The monitor should run a cleanup pass every 3 minutes.

Cleanup rule:

- find `agents` rows where `status in (start, running)`
- if `ping_date` is older than 3 minutes, update `status = crash`

This prevents stale agents from remaining in the active list after crash or hard termination.

## UI Behavior

When an agent is alive:

- the monitor connects to the agent API and WebSocket
- the browser UI talks only to the monitor
- the monitor proxies or adapts live data for the UI

When an agent is not alive:

- the monitor reads the project's `agent.glitch` database directly
- the browser UI still talks only to the monitor

This keeps the browser-side UI simple and gives the monitor one place to normalize live and historical views.

## Testing Scenarios

- first agent startup creates `registry.glitch`
- first agent startup creates a `projects` row when missing
- first agent startup sets `add_date`
- repeated startup updates the existing `projects` row
- cwd matching is stable across path case differences through `cwd_hash`
- agent startup creates an `agents` row with the correct `base_url`
- agent ping updates `ping_date`
- clean shutdown sets `agents.status = exit`
- clean shutdown stops the ping timer before final registry updates
- failure writes `error` to both the project database and the registry database
- monitor cleanup marks stale non-exit agents as `crash`
- monitor reuses an existing live `glw` instance when `monitor.lock.json` points to a valid pid
- monitor starts a new `glw serve` instance when no valid monitor is running
- historical project browsing works without a live agent

## Port Selection

Port selection should use this policy:

1. choose a random port in the range `18000` to `28000`
2. if it is unavailable, probe forward one port at a time
3. if the upper bound is reached, wrap back to `18000`
4. try at most 18 ports total
5. if none are available, fail startup

## Monitor Metadata

`monitor.lock.json` should currently contain:

- `pid` integer
- `base_url` string
- `start_date` datetime
- `version` string

## Testability

Registry and monitor code should accept the Glitch home directory as an explicit input instead of hardcoding `<home>/.glitch`.

Examples:

- runtime default: `<home>/.glitch`
- tests: `<temp_dir>/.glitch`

This allows tests to create isolated registry state in temporary directories and clean it up afterward without touching real user metadata.

## Draft Notes

This design intentionally separates:

- per-project telemetry ownership in `agent.glitch`
- cross-project discovery ownership in `registry.glitch`
- browser-facing UI hosting in `glw`

That split should scale better than mixing discovery metadata into JSON files or directly into the browser runtime.
