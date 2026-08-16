---
"@eliya-oss/agent-figma": patch
---

Node reads now name the tokens behind the numbers. A text node reports `text: md/regular` instead of leaving you to map `fontSize: 14` back to a scale, resolved from the styles map the response already carries at no extra cost. Padding, gaps and fills bound to variables resolve to names like `spacing/md` through one cached read of the file's local variables; that endpoint is Enterprise-only, so where it refuses the ids stay raw and the answer says why. A repeated id is still worth reading — two frames sharing one id share one token, which two identical numbers never showed.
