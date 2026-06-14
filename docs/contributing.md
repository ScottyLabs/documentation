---
title: Contributing
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

`AGENTS.md` files (AI agent context per [agents.md](https://agents.md/)) are **not** aggregated or published. Put human-facing docs in other markdown files.

Published pages are readable by AI agents via [Accept Markdown](https://acceptmarkdown.com/). Request any docs URL with `Accept: text/markdown` to receive Markdown from the same URL browsers use for HTML.

### Excalidraw diagrams

Place `.excalidraw.json` files in `docs/diagrams/` in your repo. They are published at `/diagrams/{your-project-slug}/` and can be embedded with the hub’s `ExcalidrawDiagram` component (see [Diagramming](/scottylabs/design/diagramming/)).

Pushes that change `docs/` trigger a docs rebuild via `docs-updated`; changes to `diagrams/` or `scripts/generate-*-excalidraw.ts` use `diagrams-updated`. Both are handled automatically by the org webhook on infra-01 (repos with `docs = true` in governance). Per-repo fallback: copy [`.forgejo/examples/trigger-docs-update.yml`](https://codeberg.org/ScottyLabs/documentation/src/branch/main/.forgejo/examples/trigger-docs-update.yml) or [`.forgejo/examples/trigger-docs-diagrams.yml`](https://codeberg.org/ScottyLabs/documentation/src/branch/main/.forgejo/examples/trigger-docs-diagrams.yml) with the `DOCS_TRIGGER_TOKEN` secret.

## Local development

Run `bun run dev`; it fetches docs from source repos before starting the dev server. In a monorepo checkout, sibling repos (e.g. `../infrastructure`) are used automatically.

## Hub documentation

Pages in **this** repository's `docs/` folder (not `src/content/docs/`) are aggregated into the **Documentation** section. Edit those files for meta-docs about the hub itself: deployment, architecture, contributing.

Site chrome (home page, getting started) lives in `src/content/docs/` and is not pulled from governance.
