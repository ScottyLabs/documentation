---
title: Diagramming
---

## Mermaid

Use fenced ` ```mermaid ` blocks in markdown. Diagrams render in docs and include a fullscreen button (hover the diagram, or press Escape to exit).

https://www.mermaidchart.com/play. Useful for very structured diagrams, such as database model.

Examples:

- [CMU Maps Database Model](https://github.com/ScottyLabs/cmumaps/wiki/Data-Storage#database-model)

- [Event Scraper System Design](https://github.com/ScottyLabs/event-scraper?tab=readme-ov-file#system-design)

## Excalidraw

https://excalidraw.com. Useful when collaborating and when you need more flexibility. The [tech stack](/documentation/tech-stack/) page embeds an Excalidraw diagram (source: `documentation/scripts/generate-tech-stack-excalidraw.ts`, output: `public/diagrams/tech-stack.excalidraw.json`).

### Diagrams in project repos

Any repo with `docs = true` in governance can ship Excalidraw scenes under `docs/diagrams/*.excalidraw.json`. The documentation hub copies them to `public/diagrams/{project-slug}/` on each build.

Embed in MDX (documentation hub or after aggregation):

```mdx
import ExcalidrawDiagram from '@/components/ExcalidrawDiagram.astro';

<ExcalidrawDiagram
  scenePath="/diagrams/tartan-vote/architecture.excalidraw.json"
  caption="Optional caption"
/>
```

Optional programmatic diagrams: add `scripts/generate-*-excalidraw.ts` in your repo; the hub runs it before aggregating scenes.

After pushing diagram changes, either rely on the org **push webhook** on `webhooks.scottylabs.org` (infra-01) or copy [`.forgejo/examples/trigger-docs-diagrams.yml`](https://codeberg.org/ScottyLabs/documentation/src/branch/main/.forgejo/examples/trigger-docs-diagrams.yml) into your repo’s `.forgejo/workflows/` with the `DOCS_TRIGGER_TOKEN` secret.

Examples:

- [CMU Maps Data Flow](https://github.com/ScottyLabs/cmumaps/wiki/Data-Flow)

## Figma

https://figma.com. Useful for low-fidelity and hi-fidelity UI designs.
