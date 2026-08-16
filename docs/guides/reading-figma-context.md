# Reading Figma context

Choose the smallest useful Figma read for a design or engineering task.

## Start with the most specific identifier

Use the most specific identifier in the task:

| Input | Best first command |
| --- | --- |
| Node URL | `node get URL` |
| File URL or key | `file get FILE --depth N` |
| Several node IDs | `file nodes get FILE --ids CSV` |
| Team ID | `team projects list TEAM_ID` |
| Project ID | `project files list PROJECT_ID` |
| Published asset key | `component get`, `component-set get`, or `style get` |

## Prefer a node over a file

A node read avoids unrelated pages and frames:

```bash
agent-figma node get \
  "https://www.figma.com/design/FILE_KEY/Kit?node-id=120-45" \
  --fields nodes \
  --json
```

If a task needs neighboring structure, read the file with a small depth first:

```bash
agent-figma file get FILE_KEY --depth 2 --fields name,document --json
```

## Read collaboration context separately

Comments and versions answer different questions from document structure:

```bash
agent-figma file comments list FILE_KEY --format ndjson
agent-figma file versions list FILE_KEY --format ndjson
```

Read them only when the task needs review history, decisions, or handoff status.

## Render when structure is not enough

```bash
agent-figma image render FILE_KEY --ids 12:34,56:78 --format png --scale 2 --json
```

Figma returns temporary image URLs. Your client must download or display them.

## Read a frame you are about to build

`--format tree` prints one readable line per node, with token names instead of raw numbers and the
sizing chain that says whether a width was chosen or measured:

```bash
agent-figma node get FIGMA_NODE_URL --format tree
```

See [Implementing a design](./implementing-a-design.md).

## Stop when the answer is supported

Do not expand from node to file, project, and team by default. Each extra read costs time, tokens, and Figma rate-limit budget.
