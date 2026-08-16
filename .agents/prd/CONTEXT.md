# Product Context

Figma files are large node trees. Agents usually need one frame, component, or shallow document outline, not the entire raw file.

Figma REST rate limits vary by plan, seat, and endpoint. Viewer and Collab seats can have small file-read budgets. The CLI must keep reads explicit and support future caching without changing command contracts.

Figma's REST API has some write endpoints, but this product intentionally excludes all of them. Canvas writes belong to Figma's Plugin API or official MCP server and are outside this CLI's current boundary.
