---
"@eliya-oss/agent-figma": patch
---

`node compare` answers whether the code says what the design asked for. Point it at a node and the files that implement it, and it reports each text style, token, size and weight the frame expects, and whether your code mentions it anywhere: the case it was built for is a label that uses the design system's text component beside a value that is raw markup inheriting the body size, which renders larger than designed and is otherwise only caught by screenshotting the result. It is a text scan, so it proves mention rather than use, and the output says so instead of pretending to be a verdict. Files are read locally and never uploaded.
