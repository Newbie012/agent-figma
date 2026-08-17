## 0.1.0-alpha.2

### Patch Changes

- The package really does ship only what it says now. Anchoring the `files` entries fixed `npm pack` and changed nothing about `pnpm publish`, which is what builds the tarball and which includes every nested `README.md` whatever the anchoring says — so two alphas went out carrying a test file and five internal READMEs. The packaging check packs with pnpm and reads the tarball rather than asking npm for a plan, so what is verified is what is published.
