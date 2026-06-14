# Forgejo integration

Workflows, example triggers for other repositories, and scripts for the documentation hub CI.

## Layout

| Path | Purpose |
| ---- | ------- |
| `workflows/deploy.yml` | Build and deploy this repository (runs on push / dispatch) |
| `examples/trigger-docs-rebuild.yml` | Copy to **governance** repo when `data/` changes |
| `examples/trigger-docs-diagrams.yml` | Copy to **project** repos when `docs/` or Excalidraw scenes change |
| `scripts/dispatch-rebuild.sh` | Shell helper for `repository_dispatch` (local or custom workflows) |

Files under `examples/` are **not** executed by Forgejo Actions in this repo.

## Documentation hub deploy workflow

[`workflows/deploy.yml`](workflows/deploy.yml) runs on:

- Push to `main`
- Pull requests to `main`
- `workflow_dispatch`
- `repository_dispatch` types `governance-updated` and `diagrams-updated`

## Trigger a rebuild from another repository

### 1. Create access token

1. Codeberg → Settings → Applications → Generate New Token
2. Grant permission to dispatch workflows on `scottylabs/documentation`
3. Store as secret `DOCS_TRIGGER_TOKEN` in the **source** repository (governance or project repo)

### 2. Add workflow file

**Governance** (`data/` changes):

```bash
mkdir -p .forgejo/workflows
cp documentation/.forgejo/examples/trigger-docs-rebuild.yml \
  .forgejo/workflows/trigger-docs-rebuild.yml
```

**Project repos** (Excalidraw diagrams):

```bash
mkdir -p .forgejo/workflows
cp documentation/.forgejo/examples/trigger-docs-diagrams.yml \
  .forgejo/workflows/trigger-docs-diagrams.yml
```

### 3. Org push webhook (optional)

infra-01 dispatches `diagrams-updated` when any Codeberg push to a docs-enabled repo includes changes under `docs/`, `**/diagrams/*.excalidraw.json`, or `scripts/generate-*-excalidraw.ts` (see `infrastructure/services/forgejo-ci/` and governance `forgejo_docs_webhooks.tf.json`). Per-repo workflows are still useful when the org webhook is unavailable.

## Shell helper

```bash
export DOCS_TRIGGER_TOKEN=...
.forgejo/scripts/dispatch-rebuild.sh governance-updated
.forgejo/scripts/dispatch-rebuild.sh diagrams-updated
```

## Testing

```bash
# In governance repo after setup
echo "# test" >> data/test.txt
git commit -am "test: trigger docs rebuild" && git push

# Check https://codeberg.org/scottylabs/documentation/actions
```

## Automatic governance updates

Once configured, governance changes automatically:

- Trigger a documentation rebuild
- Pull latest governance data
- Discover projects with `docs = true`
- Deploy updated documentation
