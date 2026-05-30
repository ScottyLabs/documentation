---
title: "Contributing"
project: "documentation"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/documentation"
---

# Contributing

## Project documentation

Put markdown in a `docs/` directory at the root of your repository. Use frontmatter for sidebar titles:

```markdown
---
title: My Page
---

# My Page
```

Enable the repo in governance (included by default). Use `docs = false` to opt out. See [Documentation Hub](/documentation/) for the full workflow.

## Hub documentation

Pages in **this** repository's `docs/` folder (not `src/content/docs/`) are aggregated into the **Documentation** section. Edit those files for meta-docs about the hub itself — deployment, architecture, contributing.

Site chrome (home page, getting started) lives in `src/content/docs/` and is not pulled from governance.
