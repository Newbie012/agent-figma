# Implementing a design

Reading a frame well enough to build it: token names instead of numbers, and whether a size was
chosen or measured.

## Read the frame as a tree first

```bash
agent-figma node get "https://www.figma.com/design/FILE_KEY/Kit?node-id=67307-140172" --format tree
```

```text
FRAME Spend panel  850x240 (own=FILL, parent=FIXED 850)  vertical  gap=spacing/md  pad=24  radius=8  fill=neutral/0
  TEXT Title  text=md/regular  14/400
  FRAME Row  802x40 (own=FILL, parent=FILL 850)  horizontal  gap=spacing/md
    TEXT Value  text=lg/semi-bold  24/600
```

One line per node, indented by depth. Everything below is also in the JSON, additively, so a script
reads the same facts with `--json`.

## Token names, not numbers

`fontSize: 14` is not a decision you can copy into code; `md/regular` is. Two sources are resolved
for you:

- **Text and paint styles.** Every node that references a style gets the name from the `styles` map
  the same response already carries. No second request.
- **Bound variables.** Padding, `itemSpacing` and fills are usually variable aliases. The CLI reads
  `GET /v1/files/:file_key/variables/local` once per file and resolves them.

Both land in an additive `tokens` object on the node:

```json
"tokens": { "text": "md/regular", "itemSpacing": "spacing/md", "fills": ["neutral/0"] }
```

The variables endpoint is Enterprise-only. When it refuses, the ids stay raw and the envelope says
so in `warnings`:

```text
gap=VariableID:5112:232297
```

That is still worth reading. Two frames showing the same id share one token, which two identical
numbers do not tell you.

## A width can be measured rather than chosen

A node reporting `width: 850` and `layoutSizingHorizontal: FILL` did not choose 850 — it filled
whatever contains it, and the frame that fixes the width sits *above* the node you asked for. A
node read returns a subtree, so that frame would otherwise be invisible, and a panel deliberately
built at half width reads exactly like one meant to stretch.

`node get` reads the chain above the node and reports it:

```json
"sizing": {
  "width": 850, "height": 240, "horizontal": "FILL", "vertical": "HUG",
  "parent": { "name": "Wrapper", "horizontal": "FIXED", "width": 850 }
}
```

The node entry also carries `ancestors`, from the page down to the containing frame. In the tree
this is the `(own=FILL, parent=FIXED 850)` on the size.

Read `own` first: `FIXED` means the number is the design's decision, `FILL` and `HUG` mean it is a
consequence — of the parent, or of the content.

That chain costs one extra request. `--no-ancestors` skips it, and a bulk `file nodes get` only
makes it when you pass `--ancestors`.

## Bound the read

`--depth` works the same on `node get`, `file nodes get` and `file get`. Start shallow:

```bash
agent-figma node get FIGMA_NODE_URL --depth 3 --format tree
```

Then go deeper on the branch you are actually building.
