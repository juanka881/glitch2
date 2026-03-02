# Supervision

Status: `implemented`

## Problem

Glitch needs a single place to launch, monitor, and stop local project processes.

That responsibility should not live inside individual monitoring modules. The agent itself should act as the process supervisor so modules such as `logger`, `requests`, and `metrics` can subscribe to process lifecycle and stream events without owning process management.

## Goals

- make the agent the single supervisor for local project processes
- define how processes are configured in `glitch.config.json`
- create stable process lifecycle events for modules to subscribe to
- track process runs in SQLite so monitoring data can be correlated to a specific run
- support multiple named processes per project
- forward all received process output back to the agent's stdout/stderr by default

## Implementation Status

This feature is implemented in the agent under `src/agent/app/supervisor`.

Shipped scope:

- loads process definitions from `glitch.config.json`
- creates and persists `agent_runs` and `process_runs`
- starts configured child processes through a dedicated process manager interface
- emits `process.start`, `process.stdout`, `process.stderr`, and `process.exit` events
- forwards aggregated child process output to the agent stdout and stderr streams
- stops spawned child processes during agent shutdown
- applies the supervision schema through the shared database migrator

Current implementation notes:

- project ids are resolved from the shared registry database by `cwd_hash`
- all new ids use UUIDv7 via the `uuid` package
- the agent startup preamble prints the agent version and configured process list before launch
- process output is line-oriented and emitted as complete lines

## Non-Goals

- remote process orchestration
- container orchestration support in v1
- restart policies beyond the simplest initial behavior
- terminal emulation features

## Configuration

Process definitions belong to the agent-level config, not to the logger module.

Example:

```json
{
  "name": "my-app",
  "processes": [
    {
      "id": "web",
      "command": "bun run dev",
      "cwd": ".",
      "env": {}
    },
    {
      "id": "worker",
      "command": "bun run worker",
      "cwd": ".",
      "env": {}
    }
  ],
  "modules": {
    "logger": {
      "enabled": true,
      "retention_days": 14
    }
  }
}
```

## Responsibilities

The agent supervision layer is responsible for:

- loading process definitions from `glitch.config.json`
- spawning and stopping configured processes
- assigning each process a `process_run`
- capturing lifecycle state such as pid, exit code, signal, and status
- emitting internal events for process start, stop, stdout, and stderr
- forwarding received process lines to the agent stdout/stderr streams in real time

Modules are responsible for subscribing to those events and handling their own persistence and transport concerns.

## Process Status Enumeration

`process_runs.status` should use a small stable enumeration:

- `init`
- `start`
- `running`
- `stop`
- `exit`
- `fail`

The agent should treat this as a closed set in v1 so modules and the UI can render process state consistently.

## Agent Run Status Enumeration

`agent_runs.status` should use a small stable enumeration:

- `start`
- `running`
- `fail`
- `exit`

The agent should treat this as a closed set in v1 so modules and the UI can render process state consistently.

When the agent transitions to `fail`, it should also persist structured failure details in the `error` column on `agent_runs`.

## Process Stream Enumeration

`process_stream` should use a closed enumeration:

- `stdout`
- `stderr`

## SQLite Schema

### `agent_runs`

Tracks each lifetime of the Glitch agent.

Columns:

- `id` uuid (text)
- `project_id` uuid (text)
- `project_name` string (text)
- `cwd` path (text)
- `start_date` datetime (text)
- `end_date?` datetime (text)
- `agent_version` string (text)
- `status` agent_run_status (text)
- `error?` json (text)

### `process_runs`

Tracks each supervised process launched by an agent run.

Columns:

- `id` uuid (text)
- `agent_run_id` uuid (text) references `agent_runs.id`
- `process_id` string (text)
- `command` string (text)
- `cwd` path (text)
- `pid?` integer (integer)
- `start_date` datetime (text)
- `end_date?` datetime (text)
- `exit_code?` integer (integer)
- `signal?` string (text)
- `status` process_status (text)

Indexes:

- `process_runs(agent_run_id, process_id)`
- `process_runs(start_date)`

## Internal Event Contract

The supervision layer should emit stable internal events that modules can subscribe to.

Suggested event names:

- `process.start`
- `process.stdout`
- `process.stderr`
- `process.exit`

Suggested payload shape:

```json
{
  "process_run_id": "uuid",
  "process_id": "web",
  "pid": 12345,
  "stream": "stdout",
  "capture_date": "2026-03-01T12:00:00.000Z",
  "line": "listening on http://localhost:3000"
}
```

Notes:

- every internal event payload should be fully populated for its event type
- use `?` in event contract documentation to mark optional fields explicitly
- payloads should remain internal to the agent unless promoted into a public API contract later

Suggested event contract:

- `process.start`
  - `process_run_id` uuid
  - `process_id` string
  - `pid` integer
  - `status` process_status
  - `start_date` datetime
- `process.stdout`
  - `process_run_id` uuid
  - `process_id` string
  - `pid` integer
  - `stream` process_stream
  - `capture_date` datetime
  - `line` string
- `process.stderr`
  - `process_run_id` uuid
  - `process_id` string
  - `pid` integer
  - `stream` process_stream
  - `capture_date` datetime
  - `line` string
- `process.exit`
  - `process_run_id` uuid
  - `process_id` string
  - `pid?` integer
  - `status` process_status
  - `end_date` datetime
  - `exit_code?` integer
  - `signal?` string

## Lifecycle

1. Agent starts and loads `glitch.config.json`
2. Agent resolves the project id from the shared registry
3. Agent creates an `agent_run`
4. Agent spawns each configured process
5. Agent creates a `process_run` for each spawned process
6. Agent emits lifecycle and stream events as the process runs
7. On process exit, agent updates `process_run`
8. On agent shutdown, agent stops all spawned child processes to avoid orphaned processes accumulating on the machine
9. After child process shutdown, agent updates `agent_run`

If the agent fails due to an internal error, it should:

1. set `agent_runs.status` to `fail`
2. persist structured error details to `agent_runs.error`
3. begin shutdown of all spawned child processes
4. finalize `end_date` if shutdown completes cleanly

If the agent is killed before it can flush final metadata, that is acceptable in v1.

## Failure Modes

The supervision design should explicitly handle:

- process spawn failure
- rapid process exit
- manual process stop
- multiple supervised processes running concurrently
- agent shutdown while processes are still active
- agent internal failure requiring child process shutdown
- agent termination before metadata cleanup completes

## Testing Scenarios

- starts configured processes with the expected command and cwd
- records one `process_run` per launched process
- captures stdout and stderr as internal stream events
- forwards process output to the aggregated agent stdout/stderr streams
- records exit code and signal correctly
- supports more than one configured process
- shuts down child processes on agent exit to avoid leaving orphan processes behind

Implemented tests cover:

- valid and invalid construction for supervision data classes
- migration application and revert behavior
- repo persistence and query methods against SQLite in-memory databases
- supervisor service lifecycle using a fake process manager
- aggregated stdout and stderr forwarding
- agent shutdown cleanup behavior

## Relationship to Other Features

- `logger` subscribes to supervision events and persists line-oriented logs
- future request, event, and metrics modules should also correlate their data to `process_run_id`

## Output Behavior

By default, supervision should stream all received lines back to the agent's own stdout/stderr, aggregating output across all managed processes as lines are received.

This keeps Glitch usable as a local process manager even before richer UI features are in place.

Terminal emulation features such as switching between process views are explicitly deferred.

## Follow-Up Work

- connect the logger module to supervision events for persistent line capture
- decide whether restart policies belong in supervision v2 or a separate runtime feature
