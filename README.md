# Glitch

Glitch is a local developer tool that gives developers a single pane of glass for local development.

It is designed to help you run local processes and inspect everything they produce in one place: logs, errors, requests, events, and, over time, metrics and database access.

## Overview

Glitch is split into two main components:

- `agent`: a local CLI that runs and supervises project processes, captures monitoring data, and stores it in a local SQLite database.
- `ui`: a small SolidJS single-page application that discovers active agents, connects to them for live updates, and also lets you inspect historical data from previous runs.

The goal is to reduce context switching during development. Instead of jumping between terminal tabs, browser devtools, log files, and ad hoc tools, Glitch provides one local workspace for understanding what your application is doing.

## Module-Based Design

Glitch is organized around togglable modules enabled through a project config file.

Examples of planned modules:

- `logger`: capture stdout/stderr and expose searchable logs
- `supervision`: supervise local processes and emit lifecycle events for modules
- `requests`: track HTTP requests and responses
- `events`: capture domain or application events
- `metrics`: collect counters, timings, and resource usage
- `database`: inspect local project database access and state

Each module can be enabled or disabled depending on the project and the developer's needs.

## Local-First Architecture

Glitch stores monitoring data in a per-project SQLite database:

- project database: `<projectRoot>/.glitch/glitch.sqlite`

To make project discovery easy across the machine, Glitch also maintains lightweight metadata in the user's home directory:

- global registry: `<home>/.glitch/`

This registry allows the UI to find:

- known Glitch-enabled projects
- active agents
- agent connection endpoints
- general Glitch settings

Whenever the agent or UI is launched for a project, that project is added to the known-project list.

## Planned Discovery Model

The current design assumes:

- each project keeps its own SQLite database locally
- the home folder keeps discovery metadata only
- active agents publish local HTTP and WebSocket endpoints
- the UI reads the registry to find active and historical projects

This keeps project data local while still making discovery simple and centralized.

## First Planned Module: Logger

The first module is `logger`.

The logger module will:

- subscribe to supervised process output from the agent
- capture `stdout` and `stderr`
- persist line-based log records into SQLite
- support full-text search over captured logs
- stream live log updates to the UI
- preserve enough fidelity to debug real local issues

The logger design lives in [`features/20260228-logger.md`](./features/20260228-logger.md).

Process supervision is designed separately in [`features/20260228-supervision.md`](./features/20260228-supervision.md).

## Repository Planning Docs

Feature planning and historical implementation notes live under [`features/`](./features/README.md).

This folder is intended to serve two purposes:

- planning staging ground for new work
- long-term artifact describing how features were designed and implemented

## Early Direction

Initial priorities:

1. establish the core agent and UI architecture
2. implement project discovery and active-agent registration
3. build the logger module and SQLite schema
4. expose live log streaming to the UI
5. expand into requests, events, metrics, and database tooling

## Tooling

Current repository tooling is based on Bun, TypeScript, and Biome.

Useful commands:

```bash
bun test
bun run check
bun run fmt
bun run lint
```

## Status

This project is early-stage and currently focused on architecture, feature planning, and the first end-to-end foundations.
