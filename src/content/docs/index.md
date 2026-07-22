# ScottyLabs Docs

Unified documentation for all ScottyLabs projects. Repositories are included by default; opt out with `docs = false` in [governance](https://codeberg.org/ScottyLabs/governance).

## How it works

1. Governance registers repositories (docs hub inclusion is on by default)
2. At build time, CI resolves each repo (monorepo sibling or shallow clone) and copies its `docs/` directory into this site
3. The built site is published to [docs.scottylabs.org](https://docs.scottylabs.org)

Aggregated pages are **not stored in git**. Edit documentation in each project's own repository.

## Adding your project

Add your repository in governance (no flag needed). To exclude a repo:

```toml
[[team.repos]]
name = "my-internal-tool"
docs = false
```

Commit markdown to `docs/` in your repository, then trigger a documentation rebuild (push to the documentation repo, or run the deploy workflow manually).
