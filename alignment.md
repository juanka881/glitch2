# Alignment Log

# Alignment: Keep Project Guidance Separate

Early on, I mixed contributor guidance, architecture, and implementation rules too freely across `AGENTS.md` and other docs. You corrected this and moved the repo toward a cleaner split:

- `AGENTS.md` is a table of contents
- `architecture.md` is the source of truth for implementation rules
- `features/*.md` hold feature planning and historical design notes

Resolved by centralizing architecture and coding rules in `architecture.md` and keeping `AGENTS.md` lightweight.

# Alignment: Date-Prefixed Feature Docs

I originally renamed the feature index itself with a date prefix. You corrected that:

- feature documents should use `YYYYMMDD-feature-name.md`
- the feature index should remain `features/README.md`

Resolved by keeping only actual feature docs date-prefixed and restoring the stable index file name.

# Alignment: JSON Uses Snake Case

Some documented JSON examples drifted into camelCase. You corrected that JSON contracts should always use `snake_case`.

Resolved by updating feature docs and `architecture.md` so JSON, registry data, config, and API payload examples use `snake_case`.

```ts
// before
const payload = { projectName: 'glitch2', lastSeenAt: now };

// after
const payload = { project_name: 'glitch2', last_seen_date: now };
```

# Alignment: Date Field Naming Uses `name_date`

I used names like `started_at` and `ended_at`. You corrected the convention to `start_date`, `end_date`, `ping_date`, and similar `name_date` fields.

Resolved by updating schemas, docs, and examples across supervision, discovery, and architecture.

# Alignment: Event Names Use Base Verbs

I used event names like `process.started`. You corrected this to base-form events such as `process.start` and `process.exit` to avoid tense ambiguity.

Resolved by updating event naming in feature docs and runtime event discussions.

```ts
// before
name: 'process.started'

// after
name: 'process.start'
```

# Alignment: Schema Documentation Must Include Logical And Physical Types

I initially described tables informally. You corrected this and required schema documentation to explicitly show:

- field name
- logical type
- SQLite storage type
- optionality with `?`
- FK references

Resolved by documenting schemas in the `field logical_type (sqlite_type)` format, for example:

```text
end_date? datetime (text)
agent_run_id uuid (text) references agent_runs.id
```

# Alignment: Agent Owns Supervision, Logger Only Observes

I originally let the logger own process startup behavior. You corrected the architecture:

- the agent is the supervisor and process manager
- the logger observes process lifecycle and stdout/stderr events
- the logger persists line-oriented log data

Resolved by splitting supervision into its own feature and narrowing the logger to buffering and persistence.

# Alignment: Log Capture Is Line-Based, Not Chunk-Based

I initially kept raw chunk capture and chunk notifications. You corrected this:

- buffer internally until newline
- emit and store whole lines only
- keep a future `event` JSON field for structured parsing

Resolved by removing chunk-oriented storage/notifications from the logger design.

```ts
// before
writeLogChunk(chunk);
emit('log.chunk', chunk);

// after
buffer += chunk;
for (const line of extractLines(buffer)) {
  writeLogLine(line);
  emit('log.write', line);
}
```

# Alignment: Use UUIDv7 And Registry-Based Project Identity

I first used a local project id file under `.glitch/id`. You later corrected the direction:

- all ids should be UUIDv7
- project identity should come from the registry DB via `cwd_hash`
- local id files are not needed now that the registry owns project identity

Resolved by removing the local project-id mechanism and using registry-backed project identity keyed by `cwd_hash`.

# Alignment: Subpath Imports Over Relative Imports

I used normal relative imports in places. You corrected this and standardized the repo on subpath imports.

Resolved by using:

- `#src/* -> ./src/*`
- `#test/* -> ./test/*`

This removed `../../..`-style paths and kept imports stable regardless of file depth.

# Alignment: Use Built-In Namespace Imports For Node Modules

I imported built-in functions piecemeal in places. You corrected this and asked for namespace-style imports for Node/Bun built-ins.

Resolved by preferring patterns like:

```ts
// before
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

// after
import path from 'node:path';
import fsp from 'node:fs/promises';
```

# Alignment: Prefer Simple, Low-Cognitive-Load Code

I repeatedly compressed logic into dense callsites, inline predicates, and nested expressions. You corrected this several times.

Resolved by preferring:

- named intermediate variables
- simple top-to-bottom flow
- lower cognitive load in predicates and transformations

```ts
// before
await Promise.allSettled([...this.managedProcesses.keys()].map((processId) => this.stopProcess(processId)));

// after
const processIds = [...this.managedProcesses.keys()];
const stopPromises = processIds.map((processId) => this.stopProcess(processId));

await Promise.allSettled(stopPromises);
```

# Alignment: Use Platform Types Directly, Avoid Clever Type Tricks

I used patterns like `ReturnType<typeof setInterval>` and mirrored framework types with custom minimal interfaces. You corrected both.

Resolved by:

- preferring built-in runtime types such as `NodeJS.Timeout`
- using real library types directly instead of local mirror interfaces

```ts
// before
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// after
let cleanupTimer: NodeJS.Timeout | null = null;
```

# Alignment: Don’t Mirror Framework Types

I introduced local minimal-cut types such as `SocketEngine` even when the library already exposed the real type. You corrected that this gives no real abstraction benefit.

Resolved by removing those local shims and using the library type directly.

```ts
// before
interface SocketEngine {
  handler(): { websocket: Bun.WebSocketHandler<unknown> };
  handleRequest(request: Request, server: Bun.Server<unknown>): Response | Promise<Response>;
}

// after
private createServer(monitorUrl: URL, app: Hono, engine: BunEngineServer) { ... }
```

# Alignment: Don’t Invent Custom Bun Routers

I built a custom route matcher around `Bun.serve` using regex patterns and route wrappers. You corrected this immediately.

Resolved first by simplifying to native Bun route objects, and later by replacing that layer entirely with Hono for routing and middleware composition.

# Alignment: Use Hono For HTTP Routing And Middleware

I initially stayed on hand-rolled `Bun.serve` routing and per-handler boilerplate. You corrected the direction:

- use Hono for route composition and middleware
- still use `Bun.serve` as the underlying server
- let Hono own routing and error handling

Resolved by moving monitor HTTP routing to Hono and centralizing shared app behavior in `createApiApp(...)`.

# Alignment: Shared App-Level `/health`

I inlined the monitor `/health` route inside `MonitorService`. You corrected this and pushed it into the shared API app helper.

Resolved by making `createApiApp(serviceName)` own `/health`, error handling, and not-found behavior.

# Alignment: Response Helpers Should Be Shared

I duplicated inline `context.json(..., 404)` and success responses across handlers. You corrected this and required shared response helpers where useful.

Resolved by adding and using:

- `okJson(...)`
- `notFoundJson(...)`

while still letting general failures throw into the shared Hono error handler.

# Alignment: Socket.IO Is Push Transport, Not RPC

I drifted into a pseudo-RPC layer over Socket.IO by using custom subscription callbacks to push snapshots on subscribe. You corrected this strongly:

- Socket.IO should only handle subscribe/unsubscribe and push events
- initial snapshots should come from normal HTTP APIs
- do not reimplement RPC or custom subscription registries over Socket.IO

Resolved by removing `EventBus` subscribe callback hooks and moving process log snapshots to a dedicated HTTP endpoint.

```ts
// before
eventBus.bind({
  onSubscribe: (socket, input) => {
    const snapshot = streamService.getSnapshot(room);
    eventBus.emitToSocket(socket, snapshot);
  },
});

// after
eventBus.bind();
// snapshot comes from GET /api/agents/:agent_id/processes/:process_run_id/log
```

# Alignment: Event Bus Should Rely On Socket.IO Rooms

I kept layering extra subscription logic on top of Socket.IO. You corrected this:

- Socket.IO already tracks room membership
- the server only needs to join/leave rooms
- event emission should target rooms directly

Resolved by simplifying `EventBus` to:

- `bind()`
- `emit(event)`
- `emitTo(room, event)`

# Alignment: Events Use `name` And `body`

I previously emitted events as `(eventName, payload)`. You corrected this and required event objects with a consistent `name` + `body` structure.

Resolved by creating validated event classes such as `StreamLineEvent` and `StreamSnapshotEvent`.

```ts
// before
eventBus.emitTo(roomName, MonitorEventName.StreamLine, payload);

// after
const lineEvent = new StreamLineEvent({
  name: MonitorEventName.StreamLine,
  body: {
    room: roomName,
    line,
  },
});

eventBus.emitTo(roomName, lineEvent);
```

# Alignment: Monitor Lock Uses Lock File Plus State File

I went down the wrong path by moving monitor process state into the registry DB. You corrected that:

- ownership should be an OS-backed lock file
- readable monitor metadata should live next to it
- the registry DB is not the monitor lock/state mechanism

Resolved by using:

- `monitor.lock` for exclusivity
- `monitor.state.json` for readable metadata

# Alignment: Avoid Clever Or Artificial Runtime Control Flow

I introduced patterns like unresolved promises and endless loops where simple runtime conditions already existed. You corrected this repeatedly.

Resolved by:

- removing fake forever-waits
- using natural loop conditions like `while (isAlive(...))`
- putting timeout checks inside the loop body

```ts
// before
await new Promise(() => {});
for (;;) {
  ...
}

// after
while (this.processManager.isAlive(pid)) {
  const elapsedMs = Date.now() - startDate;
  if (elapsedMs >= timeoutMs) {
    break;
  }

  await wait(delayMs);
}
```

# Alignment: Separate App Creation From Server Creation

I let `MonitorService.serve()` accumulate too much inline setup work. You corrected this and asked for a separate app-construction method.

Resolved by splitting:

- `createApp(...)`
- `createServer(...)`

so routing/app setup and server startup are easier to follow.

# Alignment: Feature API Entry Files Should Be Prefixed

I originally used generic names like `router.ts` and `api-shapes.ts` in the monitor feature API folder. You corrected this for consistency with the rest of the repo.

Resolved by renaming them to:

- `monitor-router.ts`
- `monitor-api-shapes.ts`

and documenting that pattern in `architecture.md`.

# Alignment: API DTO Converters Should Only Exist When They Translate

I added converter helpers such as `toAgentRunRecord(...)` that only called `new AgentRunRecord(model)`. You corrected this as unnecessary abstraction.

Resolved by deleting those helpers and constructing DTOs directly in handlers unless real translation logic is needed.

```ts
// before
const agent = toAgentRecord(details.agent);

// after
const agent = new AgentRecord(details.agent);
```

# Alignment: IO-Bound Shapes Must Be Explicit And Nullable, Not Partial

I needed correction on how to think about transport and storage-bound object shapes. You clarified that IO-bound shapes should always show the full contract.

Resolved by documenting that:

- DB models
- API DTOs
- config objects
- event payloads

should use explicit fields with `type | null` for nullable values, not optional `?`, so the object shape remains fully visible at runtime.

```ts
// contract shape
readonly end_date!: string | null;

// internal helper shape
endDate?: string;
```

# Alignment: Readability Matters More Than Brevity

Across the session, a recurring correction was that I sometimes optimized for compactness instead of clarity. You repeatedly pushed the code toward:

- stable cognitive load
- simple top-to-bottom scanning
- clear separation of setup, act, and output

Resolved by using more intermediate variables, less inline cleverness, and cleaner feature boundaries throughout the code and documentation.

# Alignment (2026-03-02 13:44): Use `interface` For Object-Shaped Contracts

I used `type` aliases for plain object-shaped structures such as row objects and similar record-like contracts. You corrected this and clarified the rule:

- use `interface` for object-like structures
- reserve `type` for unions, function aliases, and more advanced type composition where `interface` is not the right fit

Resolved by treating row shapes, props, DTO-like object contracts, and similar structures as `interface`s unless there is a real reason to use `type`.

```ts
// before
type AgentRunRow = {
  id: string;
  project_id: string;
  project_name: string;
  cwd: string;
  start_date: string;
  end_date: string | null;
  agent_version: string;
  status: AgentRunStatus;
  error: string | null;
};

// after
interface AgentRunRow {
  id: string;
  project_id: string;
  project_name: string;
  cwd: string;
  start_date: string;
  end_date: string | null;
  agent_version: string;
  status: AgentRunStatus;
  error: string | null;
}
```

# Alignment (2026-03-02 13:44): Use Single Underscores For CSS Part Names

I used double-underscore BEM-style part names such as `gl-app-shell__sidebar`. You corrected this to keep class names tighter and more consistent with the repo's dash-case component names.

Resolved by using a single underscore to separate component parts while keeping modifiers on the component class itself.

```css
/* before */
.gl-app-shell__sidebar {}

/* after */
.gl-app-shell_sidebar {}
```

# Alignment (2026-03-02 13:44): Component Folders Should Match Component Names

I originally placed components under generic folders like `button` and `panel`. You corrected this so the folder name matches the component name directly.

Resolved by using folders such as:

- `src/web/components/gl-button/*`
- `src/web/components/gl-panel/*`

This keeps imports and file discovery more direct.

# Alignment (2026-03-02 13:44): Component Folders Need `index.ts`

I initially had component implementation files and CSS only. You corrected this so each component folder exposes a clean public surface through `index.ts`.

Resolved by adding `index.ts` files that re-export the component and any related types from the folder.

```ts
// src/web/components/gl-button/index.ts
export * from './gl-button';
```

# Alignment (2026-03-02 13:44): Export Component Prop Interfaces

I defined component prop interfaces without exporting them. You corrected this so the component folder's `index.ts` can expose the component's public contract cleanly.

Resolved by exporting prop interfaces such as `GlButtonProps`, `GlPanelProps`, and similar component props.

# Alignment (2026-03-02 13:44): Use Semantic Tables For Tabular UI

I built tabular UI pieces like the data grid and log stream using `div` layouts. You corrected this because the data is tabular by nature and should use actual table semantics.

Resolved by rewriting those components to use `table`, `thead`, `tbody`, `tr`, `th`, and `td`.

```tsx
// before
<div class="gl-data-grid__row">
  <span class="gl-data-grid__cell">...</span>
</div>

// after
<tr class="gl-data-grid_row">
  <td class="gl-data-grid_cell">...</td>
</tr>
```

# Alignment (2026-03-02 13:44): Don’t Repeat `@jsxImportSource` In Files

I left `/** @jsxImportSource solid-js */` directives scattered through the web source and tests even though the TypeScript config already defines that JSX source.

Resolved by removing the per-file directives and relying on the shared TS configuration.

# Alignment (2026-03-02 13:44): Event Sources Should Wrap A Shared Socket, Not Create Their Own Lifecycle

I designed `MonitorEventSource` so it created and managed its own socket lifecycle and bundled room subscription together with handler registration. You corrected this because it encourages multiple sockets and makes the consumer API too rigid.

Resolved by restructuring the event source around:

- a socket passed into the class
- explicit `subscribeToProcess(...)` and `unsubscribeFromProcess(...)`
- separate `on...(...)` and `off...(...)` methods for each event type
- a convenience helper that can create an instance from a URL when needed

# Alignment (2026-03-02 13:44): Keep Snapshot Fetching On HTTP, Not Socket.IO RPC

I let the socket path drift toward pseudo-RPC by pushing initial snapshots through subscription callbacks. You corrected this and pushed the design back to:

- HTTP for snapshots
- Socket.IO for live push only

Resolved by adding an HTTP process log endpoint for the initial buffer snapshot and leaving Socket.IO to deliver only new stream events.

# Alignment (2026-03-02 13:44): Prefer Child Parts Over Multiple JSX Props

I used components like `GlSplitLayout` with `primary` and `secondary` JSX props. You corrected this because the callsites become noisy and hard to scan.

Resolved by moving to explicit child part components so the layout reads top-to-bottom in JSX.

```tsx
// before
<GlSplitLayout primary={<Primary />} secondary={<Secondary />} />

// after
<GlSplitLayout>
  <GlSplitLayoutPane type="primary"><Primary /></GlSplitLayoutPane>
  <GlSplitLayoutPane type="secondary"><Secondary /></GlSplitLayoutPane>
</GlSplitLayout>
```

# Alignment (2026-03-02 13:44): Use `props.children` For Single-Slot Content

I passed JSX values through named props like `value={...}` in simple one-slot cases such as `GlFieldRow`. You corrected this because it adds noise without adding real structure.

Resolved by keeping simple label-like scalar props as props and using `props.children` for the single slotted content.

# Alignment (2026-03-02 13:44): Use Named Prop Interfaces Instead Of Inline Object Types

I used inline object type annotations for helper and route component props, such as `function ProjectListPanel(props: { ... })`. You corrected this because it increases punctuation density and cognitive load.

Resolved by extracting named prop interfaces for component helpers and local panel components.

```ts
// before
function ProjectListPanel(props: {
  projects: GetProjectListOutput;
  columns: GlDataGridColumn<ProjectRecord>[];
}) { ... }

// after
interface ProjectListPanelProps {
  projects: GetProjectListOutput;
  columns: GlDataGridColumn<ProjectRecord>[];
}

function ProjectListPanel(props: ProjectListPanelProps) { ... }
```

# Alignment (2026-03-02 13:44): Reuse Derived Child Collections In Composed Components

In `GlSplitLayout`, I called `resolvedChildren.toArray()` separately for each pane lookup. You corrected this because it recreates the same derived array multiple times and adds needless work and noise.

Resolved by computing the child list once and reusing it across the pane lookups.

```ts
// before
const resolvedChildren = children(() => props.children);
const primaryPane = createMemo(() => findPane(resolvedChildren.toArray(), 'primary'));
const secondaryPane = createMemo(() => findPane(resolvedChildren.toArray(), 'secondary'));

// after
const resolvedChildren = children(() => props.children);
const childList = createMemo(() => resolvedChildren.toArray());
const primaryPane = createMemo(() => findPane(childList(), 'primary'));
const secondaryPane = createMemo(() => findPane(childList(), 'secondary'));
```

# Alignment (2026-03-02 13:44): Use One Wrapper Map In Event Sources

I created one callback-wrapper map per monitor event type in `MonitorEventSource`. You corrected this because it does not scale well as event types grow and the callback identity already gives us enough information to track wrapper registration.

Resolved by using one shared wrapper map keyed by callback identity and routing registration through shared helper methods.

```ts
// before
private readonly snapshotWrappers: Map<SnapshotCallback, (fields: unknown) => void>;
private readonly lineWrappers: Map<LineCallback, (fields: unknown) => void>;
private readonly clearWrappers: Map<ClearCallback, (fields: unknown) => void>;

// after
private readonly wrappers: Map<Function, (fields: unknown) => void>;
```

# Alignment (2026-03-02 13:44): Prefer Bun `mock()` For Simple Test Doubles

I used hand-written inline fake dependency objects in route tests just to satisfy collaborator interfaces. You corrected this because Bun already provides `mock()` for this, and it keeps test doubles more consistent and easier to inspect.

Resolved by preferring Bun's mock helpers for simple collaborator stubs in tests.

```ts
// before
const monitorEventSource = {
  subscribeToProcess() {},
  unsubscribeFromProcess() {},
} as unknown as MonitorEventSource;

// after
const monitorEventSource = {
  subscribeToProcess: mock(() => {}),
  unsubscribeFromProcess: mock(() => {}),
} as unknown as MonitorEventSource;
```

# Alignment (2026-03-02 13:44): Let Mock Factory Return Types Be Inferred

I annotated `createMock...()` helpers with explicit return types that erased the Bun mock API from the returned properties. You corrected this because it makes later test setup and call assertions harder.

Resolved by letting mock-factory return types be inferred so the mock methods remain available to the test.

```ts
// before
function createMockMonitorEventSource(): MonitorEventSource {
  return {
    subscribeToProcess: mock(() => {}),
  } as unknown as MonitorEventSource;
}

// after
function createMockMonitorEventSource() {
  return {
    subscribeToProcess: mock(() => {}),
  };
}
```

# Alignment (2026-03-02 13:44): Extract Reused Test Double Shapes Into Shared Mock Factories

I kept recreating the same monitor API client and monitor event source mock shapes inline across multiple web route tests. You corrected this because it duplicates setup, makes tests noisier, and scatters one mock contract across many files.

Resolved by moving reused web test doubles into `test/web/mocks/*` and having each test create an instance and then configure the specific mocked methods it needs.

```ts
// before
OverviewRoute({
  monitorApiClient: {
    getMonitor: async () => new GetMonitorOutput(...),
    getProjectList: async () => new GetProjectListOutput(...),
    getAgentList: async () => new GetAgentListOutput(...),
  },
});

// after
const monitorApiClient = createMonitorApiClientMock();
monitorApiClient.getMonitor.mockResolvedValue(new GetMonitorOutput(...));
monitorApiClient.getProjectList.mockResolvedValue(new GetProjectListOutput(...));
monitorApiClient.getAgentList.mockResolvedValue(new GetAgentListOutput(...));
```

# Alignment (2026-03-02 13:44): Terminate Type Aliases With Semicolons

I left exported type aliases without trailing semicolons. You corrected this because type alias declarations should read as complete statements and stay visually consistent with the rest of the codebase.

Resolved by terminating type alias declarations with semicolons.

```ts
// before
export type SnapshotCallback = (event: StreamSnapshotEvent) => void

// after
export type SnapshotCallback = (event: StreamSnapshotEvent) => void;
```

# Alignment (2026-03-02 13:44): Use Explicit Callback Types Instead Of `Function`

I used `Function` as the key type for the monitor event-source wrapper map. You corrected this because `Function` is too broad, unsafe, and loses the actual contract shape we already know.

Resolved by defining and using an explicit callback type for event-source callback identity instead of falling back to `Function`.

```ts
// before
private readonly wrappers: Map<Function, (fields: unknown) => void>;

// after
export type MonitorEventCallback = (...args: never[]) => unknown;
private readonly wrappers: Map<MonitorEventCallback, (fields: unknown) => void>;
```

# Alignment (2026-03-02 13:44): Don’t Hide Straightforward Wrapper Creation Behind Tiny Generic Helpers

I extracted `MonitorEventSource.onEvent(...)` as a generic helper that took an event name, callback, and parse function, then built the wrapper internally. You corrected this because the wrapper creation at each callsite was already straightforward and the helper added abstraction cost without making the code easier to read.

Resolved by inlining the wrapper creation in each `onSnapshot`, `onLine`, and `onClear` method and keeping only the shared `offEvent(...)` cleanup helper.

```ts
// before
private onEvent<TEvent>(eventName, callback, parse) {
  const wrapper = (fields) => {
    const event = parse(fields);
    callback(event);
  };

  this.wrappers.set(callback, wrapper);
  this.socket.on(eventName, wrapper);
}

// after
onSnapshot(callback: SnapshotCallback): () => void {
  const wrapper = (fields: unknown) => {
    const event = new StreamSnapshotEvent(fields);
    callback(event);
  };

  this.wrappers.set(callback, wrapper);
  this.socket.on(MonitorEventName.StreamSnapshot, wrapper);
  return () => this.offSnapshot(callback);
}
```

# Alignment (2026-03-02 19:24): Move The Test Suite From Bun To Vitest

I kept the test suite on Bun's runner even after the frontend tests started to need Solid-specific transformation and browser-style testing behavior. You corrected this and moved the repo to Vitest so app and web tests can be configured independently.

Resolved by switching test imports and mocks over to Vitest, updating repo guidance to use `bun run test`, `bun run test:app`, and `bun run test:web`, and moving web component and route tests toward `@solidjs/testing-library` with `render` and `screen`.

```ts
// before
import { test } from 'bun:test';
import { renderToString } from 'solid-js/web';

// after
import { expect, test, vi } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
```

# Alignment (2026-03-02 19:24): Inline Solid Dependencies In The Vitest Web Project

I treated the earlier frontend test failures like generic runner instability, when the actual issue was that the web Vitest project was not transforming Solid-related dependencies correctly. You stabilized the setup and identified the key config fix.

Resolved by configuring the web Vitest project with `test.server.deps.inline = true`, so the SolidJS-related code is transformed by the Vite/Solid pipeline instead of being left in an incompatible state during tests.

```ts
// key web-project Vitest config
server: {
  deps: {
    inline: true,
  },
}
```

# Alignment (2026-03-02 22:36): Use MemoryRouter In Route Tests

I originally rendered some route components directly in tests without giving them a real router context. You corrected this and asked that route tests always mount the route under a `MemoryRouter` with a single route entry that points at the component under test.

Resolved by wrapping route tests in a `MemoryRouter` and registering one `Route` for `/` so the route component receives the same routing context shape it expects at runtime.

```tsx
// before
render(() => <OverviewRoute monitorApiClient={client} />);

// after
render(() => (
  <MemoryRouter>
    <Route path="/" component={() => <OverviewRoute monitorApiClient={client} />} />
  </MemoryRouter>
));
```
