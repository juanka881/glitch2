# Features

This folder is the planning and historical record for Glitch features.

Use it for two things:

- planning new modules before implementation starts
- documenting how a feature was ultimately designed and shipped

Each feature should have its own Markdown file, using a date prefix so the files sort naturally in the order they were introduced.

Naming pattern:

- `YYYYMMDD-featurename.md`

Examples:

- `20260228-logger.md`
- `20260228-discovery.md`
- `20260228-supervision.md`
- `20260315-requests.md`
- `20260320-metrics.md`

## Recommended Structure

Each feature document should include:

- status
- problem statement
- goals
- non-goals
- architecture
- config and public interfaces
- storage model
- implementation phases
- test scenarios
- open questions
- post-implementation notes

## Status Values

Use one of these status values near the top of each file:

- `proposed`
- `in-progress`
- `implemented`
- `deprecated`

## Guidance

Keep feature docs practical and decision-complete.

The goal is that a future contributor should be able to open a feature document and understand:

- why the feature exists
- what was decided
- what data it stores
- how it integrates with the rest of Glitch
- what still needs to change

When a feature is implemented, update the document instead of replacing it entirely. Preserve the original design intent where useful so the file remains a historical artifact.
