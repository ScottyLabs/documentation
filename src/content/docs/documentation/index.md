---
title: Documentation Hub
project: "documentation"
projectType: "starlight"
---

# Documentation Hub

This site aggregates documentation from ScottyLabs projects. Projects opt in via `docs = true` in the [governance](https://codeberg.org/ScottyLabs/governance) repository.

## How it works

1. Governance marks repositories with `docs = true`
2. CI clones each repo and copies its `docs/` directory into this site
3. The built site is published to [docs.scottylabs.org](https://docs.scottylabs.org)

This repository's own pages live here under **Documentation** — separate from the Starlight site shell in `src/content/docs/`.

## Adding your project

Add to your team's governance file:

```toml
[[team.repos]]
name = "my-project"
docs = true
docs_dir = "docs"  # optional, default is docs
```

Commit markdown to `docs/` in your repository. Changes deploy automatically when governance or your repo triggers a rebuild.
