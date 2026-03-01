# Agent Guide

Use this file as the entrypoint for repository guidance. It is a table of contents, not the full source of truth for implementation details.

## How To Use This File

Before making changes, identify the kind of work you are doing and open the matching document.

- product or repository overview
  - read [`README.md`](./README.md)
- implementation, architecture, code layout, schema conventions, testing rules, or TypeScript structure
  - read [`architecture.md`](./architecture.md)
- feature planning or implementation details for a specific module
  - read [`features/README.md`](./features/README.md) and then the relevant feature file

## Source Of Truth

For code work, [`architecture.md`](./architecture.md) is the primary source of truth.

It defines:

- agent folder structure
- feature module structure
- database and migration layout
- models, Zod validation, and schema conventions
- naming, import, and service or repo rules
- testing expectations
- JSON, event, and SQLite contract conventions

If `AGENTS.md` and `architecture.md` ever disagree, follow `architecture.md`.

## Feature Documents

Feature planning lives under [`features/`](./features/README.md).

Current design documents:

- [`features/20260228-supervision.md`](./features/20260228-supervision.md)
- [`features/20260228-logger.md`](./features/20260228-logger.md)
- [`features/20260228-discovery.md`](./features/20260228-discovery.md)

Use these when working on a specific feature or when a prompt references a module by name.

## Working On Code

When implementing code:

1. read this file
2. read [`architecture.md`](./architecture.md)
3. read the relevant feature document under [`features/`](./features/README.md)
4. implement changes to match those documents

## Tooling

Common commands:

```sh
bun test
bun run typecheck
bun run format
bun run lint
```
