# TestDriver

Create a new `FigmaCliTestDriver` in each test. Arrange state through `driver.auth` and `driver.figma`, run commands through `driver.cli`, and keep assertions in the spec.

The fake Figma adapter matches the exact REST path and query, so tests prove the public command contract without live API calls.
