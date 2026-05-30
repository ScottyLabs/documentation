---
title: "Documentation Hub"
project: "documentation"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/documentation"
---

# Documentation Hub

This site aggregates documentation from ScottyLabs projects. Repositories are included by default; opt out with `docs = false` in [governance](https://codeberg.org/ScottyLabs/governance).

## How it works

1. Governance registers repositories (docs hub inclusion is on by default)
2. CI clones each repo and copies its `docs/` directory into this site
3. The built site is published to [docs.scottylabs.org](https://docs.scottylabs.org)

This repository's own pages live here under **Documentation** — separate from the Starlight site shell in `src/content/docs/`.

## Adding your project

Add your repository in governance (no flag needed). To exclude a repo:

```toml
[[team.repos]]
name = "my-internal-tool"
docs = false
```

Commit markdown to `docs/` in your repository. Changes deploy automatically when governance or your repo triggers a rebuild.
