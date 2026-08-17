## 0.1.0-alpha.0

### Patch Changes

- The readme is written for how the CLI is actually used: you log in and install the skill once, then ask your agent, which is what runs the commands. For the rarer case of poking at it yourself it points at `--help`, which reads the whole surface back, rather than listing commands that would go stale.

- `--format tree` prints a frame as one indented line per node, carrying the name, size, sizing chain, layout mode, gap, padding, radius and resolved token names. It is the output someone implementing a design actually wants, instead of a throwaway script to walk the JSON. `--depth` also works on `node get` and `file nodes get` now, the way it always did on `file get`.

- A node now says whether its size was chosen or measured. `width: 850` with `layoutSizingHorizontal: FILL` means the frame above it fixed the width, and that frame is outside the subtree a node read returns, so it used to be invisible: a panel deliberately built at half width read exactly like one meant to stretch. `node get` reads the chain above the node and reports `sizing.parent` and `ancestors` alongside the node's own sizing. `--no-ancestors` skips the extra read, and `file nodes get` makes it only with `--ancestors`.

- Documentation ships as Markdown in `docs/`, indexed by `docs/README.md` and included in the package, so an agent reads it from the install rather than the network. `docs/reference/commands.md` is generated from the command catalog and checked against it, so it cannot describe a surface the CLI no longer has.

- Help reads like an answer rather than a list. `--help` groups the commands by what they are for, a command's own page prints its usage line, every flag with what it means and which are required, the endpoint it reads and the scopes it needs, and `-h` and `-v` work. Running the bare command at a terminal now names the two commands to start from instead of printing the whole catalog, which is still what a script gets.

- A flag the command does not declare is now refused before anything reaches Figma. `agent-figma file get KEY --depht 2` used to drop the flag and answer with the whole file, which is the one failure a caller cannot see. A mistyped command names the nearest one, a noun given without a verb lists its verbs, and every usage failure carries the command and the usage line it should have been typed as.

- Node reads now name the tokens behind the numbers. A text node reports `text: md/regular` instead of leaving you to map `fontSize: 14` back to a scale, resolved from the styles map the response already carries at no extra cost. Padding, gaps and fills bound to variables resolve to names like `spacing/md` through one cached read of the file's local variables; that endpoint is Enterprise-only, so where it refuses the ids stay raw and the answer says why. A repeated id is still worth reading — two frames sharing one id share one token, which two identical numbers never showed.

- `node compare` answers whether the code says what the design asked for. Point it at a node and the files that implement it, and it reports each text style, token, size and weight the frame expects, and whether your code mentions it anywhere: the case it was built for is a label that uses the design system's text component beside a value that is raw markup inheriting the body size, which renders larger than designed and is otherwise only caught by screenshotting the result. It is a text scan, so it proves mention rather than use, and the output says so instead of pretending to be a verdict. Files are read locally and never uploaded.
