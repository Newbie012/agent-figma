# PRD-004 - Design tokens and the sizing chain

## User need

Someone implementing a design reads `fontSize: 14`, `itemSpacing: 12`, `fill: #f9fafb` and has to
reverse-map every number to a design-system token. The token names are already in the payload,
unresolved, so the mapping is guesswork that is silently wrong when it is wrong — and a node with no
token at all looks exactly like a node with one.

The same reading fails in the other direction on size. A node reports `width: 850` and
`layoutSizingHorizontal: FILL`, which means the 850 was *measured* inside whatever contains it. The
frame that fixes it sits above the requested node, and `node get` returns a subtree with no
ancestors at all, so the constraint is invisible: a panel that is deliberately half-width reads
exactly like one that should stretch. Getting this wrong ships a layout that looks right in the
node payload and wrong on the page.

Two more things a payload does not say out loud. Every coordinate Figma returns is a canvas
coordinate, so a layer's place inside the frame being implemented has to be worked out by hand, and
a wrong subtraction is a wrong layout that reads as a correct one. And a layer Figma will not draw
sits in the payload beside the layers it will, at plausible coordinates, so reading a design from
JSON reliably invents work that does not exist.

## Behavior

- Resolve style references on every node from the `styles` map the same response already carries, so
  a text node reports `text: "md/regular"` without a second request.
- Resolve `boundVariables` to variable names through `GET /v1/files/:file_key/variables/local`, at
  most once per file per command run, so spacing, padding and fills report `spacing/md` and
  `neutral/0`.
- Report resolved names in an additive `tokens` object on the node. Every existing field keeps its
  shape and its value.
- Leave a variable id raw in `tokens` when it cannot be resolved, and say why in `warnings`. A
  repeated raw id still carries the structure: two frames that share `VariableID:5112:232297` share
  one token, which two identical numbers do not show.
- Report a `sizing` object on every node: its measured width and height, its own
  `layoutSizingHorizontal` and `layoutSizingVertical`, and the same for the node that contains it.
- Read the frames above the requested node, so the containing frame is named even though it is
  outside the returned subtree. `node get` does this by default and `--no-ancestors` turns it off;
  a bulk `file nodes get` does it only when asked with `--ancestors`.
- Offer `--format tree`: one line per node, indented by depth, carrying its place, name, size, the
  sizing chain, layout mode, gap, padding, radius and the resolved tokens. This is the output someone
  implementing a design reads top to bottom:

  ```text
  FRAME Spend panel  850x240 (own=FILL, parent=FIXED 850)  vertical  gap=spacing/md  pad=24  radius=8
    TEXT Title  at=24,24  text=md/regular  14/400
    FRAME Row  at=24,66  802x40 (own=FILL, parent=FILL 850)  horizontal  gap=spacing/md
  ```

- Place every layer in the tree against the node that was asked for, not the canvas. The requested
  node is the frame of reference and carries no place of its own.
- Leave layers the design does not draw out of the tree. `--include-hidden` keeps them, marked
  `hidden`, for the times the question is what a variant holds rather than what it renders.

- Accept `--depth` on `node get` and `file nodes get`, as `file get` already does.

## Refusals

- The variables endpoint is Enterprise-gated. A refusal from it is not a failure of the command: the
  read still answers, with raw ids and a warning naming the status. Exit code stays `0`. The same
  holds for the ancestors read: a node that answers without its chain is worth more than a node that
  does not answer.
- No second request is made when the payload binds no variables, so a file with no variables costs
  exactly what it costs today.
- Resolution never invents a name. An id with no entry in the variables map stays an id.

## Acceptance

- `node get` on a frame with text styles prints style names, and makes exactly one request.
- Variable-bound spacing, padding and fills print token names; when the variables endpoint answers
  403 they print raw ids and the envelope carries a warning naming the status and the endpoint.
- The variables endpoint is requested at most once per file in one command run.
- `--format tree` renders a frame and its descendants as indented lines a person can read.
- Each line places its layer relative to the requested node, and the requested node itself has no
  `at=`.
- A `visible: false` layer and everything under it is absent from the tree, and present and marked
  `hidden` under `--include-hidden`.
- `node get` reports the requested node's own sizing and the sizing of the frame above it, and lists
  that frame in `ancestors`, in one extra request.
- `--no-ancestors` makes that request go away, and a bulk `file nodes get` does not make it unless
  `--ancestors` asks.
- `--depth` behaves the same on `node get`, `file nodes get` and `file get`.
- Existing JSON output is unchanged except for the added `tokens`, `sizing`, `ancestors` and
  warnings.

## Out of scope

- Comparing a node against the code that implements it. That is [PRD-005](005-comparing-against-code.md).
- Publishing tokens as a stylesheet, a Tailwind config, or any other code artifact. This PRD reports
  what Figma says; generating code from it is a separate product decision.
- Variable modes. `variables/local` carries a value per mode; this PRD resolves names only, because
  a name is what a caller writes in code.
- Constraints other than auto-layout sizing: `constraints`, min and max width, and absolute
  positioning. The sizing chain answers "is this number chosen or measured"; the rest is layout
  detail the payload already reports faithfully.
