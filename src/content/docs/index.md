# ScottyLabs Docs

Unified documentation for all ScottyLabs projects. Every repository registered in [governance](https://git.cmu.dev/ScottyLabs/governance) is included automatically.

## How it works

1. Governance registers repositories (every registered repository is included)
2. At build time, CI resolves each repo (monorepo sibling or shallow clone) and copies its `docs/` directory into this site
3. The built site is published to [docs.scottylabs.org](https://docs.scottylabs.org)

Aggregated pages are **not stored in git**. Edit documentation in each project's own repository.

## Adding your project

Add your repository in governance; no flag is needed, and there is nothing to configure here.

Commit markdown to `docs/` in your repository, then trigger a documentation rebuild (push to the documentation repo, or run the deploy workflow manually).
