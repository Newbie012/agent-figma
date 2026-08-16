# PRD-005 - Comparing a node against the code that implements it

## User need

A panel was built from a design. The labels used the design system's text component; the values were
raw markup that inherited the body size, so they rendered larger than designed. Nothing in the CLI
could say so — the mistake was caught by screenshotting the result and looking at it.

The design side of that comparison is now readable ([PRD-004](004-design-tokens.md)): the frame says
which text styles and tokens it expects. The code side is a file on disk. What is missing is the
question "does the code ever mention what the design asked for".

## Behavior

- `node compare FILE_OR_URL --code PATH[,PATH]` reads the node, reads the named files, and answers
  with one finding per expectation the design makes.
- An expectation is a text style name, a paint style name, a resolved variable name, or — only where
  the design named no style — a font size and weight. A node using the design system correctly is
  expected to name the style, not the numbers behind it.
- Each finding carries the expectation, whether the code mentions it, the file it was found in, and
  the nodes it came from, so a miss can be located in the design. Node lists are capped at five
  names with a count, because a token used by forty nodes does not need forty names.
- A token is matched in its Figma spelling and the spellings a codebase uses for it: `md/regular`,
  `md-regular`, `md_regular`, `md.regular`, `mdRegular`. A font size matches `24px`, `1.5rem`,
  `font-size: 24`, and `text-[24px]`; a weight matches `600`, `font-600` and `semibold`.
- Paths are read locally and never sent anywhere. A directory is walked, skipping `node_modules`,
  `.git`, `dist`, `build`, `coverage`, `.next` and `.turbo`, for source and stylesheet extensions.
- A path that cannot be read is named in `warnings`, and the comparison runs on the rest.

## Refusals

- **The answer is a list of expectations, never a verdict.** This is a text scan. It proves that a
  name appears in a file, not that the right element uses it, and it cannot see a computed style, an
  inherited one, or a class applied three files away. Reporting a pass as correctness would be a
  lie, and reporting a miss as a bug would be a worse one. Both are said in the output itself.
- No expectation is made of a variable id that could not be resolved. Expecting the code to mention
  `VariableID:5112:232297` reports a failure of the read as a failure of the code.
- `--code` is required. A comparison against nothing would report every expectation as missing,
  which reads like a broken implementation rather than a missing argument.
- Nothing is written, in Figma or on disk.
- Exit code stays `0` when the comparison ran. A finding is data, not a failed request; a caller
  that wants to gate on it branches on `data.summary.missing`.

## Acceptance

- A node whose label uses a text style the code names, and whose value uses one it does not, reports
  the first as found and the second as missing, naming the node the miss came from.
- A token spelled `--lg-semi-bold` in CSS counts as mentioned.
- Font size and weight are expected only for text nodes with no text style.
- An unresolved variable id never appears as an expectation.
- A path that does not exist is named in `warnings` and the rest is still compared.
- `node compare` without `--code` is refused with `UsageError`, naming the command and its usage.
- The human rendering prints one line per expectation and says plainly what a mention does and does
  not prove.

## Out of scope

- Parsing the code. A real answer would need the framework's semantics — which element renders which
  node, what the cascade resolves to — and that is a different product. This PRD buys most of the
  value of that for none of its cost, and says so rather than implying otherwise.
- Matching a node to a component automatically. The caller names the files.
- Colour comparison. Figma paints are floats and code writes hex, `rgb()`, or a variable; the
  conversions are lossy enough that a wrong answer is likely, and a wrong colour report is worse
  than none. Revisit when paints resolve to tokens on this account.
- Writing fixes. The CLI reads.
