# Workflow to Add to Governance Repository

This workflow should be added to the governance repository at:
`.forgejo/workflows/trigger-docs-rebuild.yml`

It will automatically trigger the documentation hub to rebuild whenever governance changes.

```yaml
name: Trigger Documentation Rebuild

on:
  push:
    branches:
      - main
    paths:
      - 'data/**'  # Only trigger when team/project data changes

jobs:
  trigger-docs:
    runs-on: docker
    steps:
      - name: Trigger documentation rebuild
        run: |
          curl -X POST \
            -H "Authorization: token ${{ secrets.DOCS_TRIGGER_TOKEN }}" \
            -H "Accept: application/json" \
            -H "Content-Type: application/json" \
            https://codeberg.org/api/v1/repos/scottylabs/documentation/dispatches \
            -d '{"event_type": "governance-updated"}'
```

## Setup Instructions

### 1. Create Access Token

1. Go to Codeberg Settings → Applications → Generate New Token
2. Name it "Governance Docs Trigger"
3. Grant permissions: `write:repository` (or at minimum, trigger workflows)
4. Copy the token

### 2. Add Secret to Governance Repository

1. Go to `ScottyLabs/governance` repository settings
2. Navigate to Secrets → Actions
3. Add new secret:
   - Name: `DOCS_TRIGGER_TOKEN`
   - Value: (paste the token from step 1)

### 3. Add Workflow File

Create `.forgejo/workflows/trigger-docs-rebuild.yml` in the governance repository with the content above.

## How It Works

1. **Governance change**: Someone commits to `data/` in governance repo
2. **Trigger workflow**: Governance workflow sends API request to docs repo
3. **Docs rebuild**: Documentation hub workflow starts automatically
4. **Fresh docs**: Updated documentation is deployed with latest governance data

## Testing

Test the integration:
```bash
# In governance repo, make a change to data/
echo "# test" >> data/test.txt
git add data/test.txt
git commit -m "test: trigger docs rebuild"
git push

# Check that docs workflow was triggered at:
# https://codeberg.org/scottylabs/documentation/actions
```

## Alternative: Webhook (if preferred)

Instead of using repository dispatch, you can set up a webhook:

1. In governance repo settings → Webhooks → Add webhook
2. Payload URL: `https://codeberg.org/api/v1/repos/scottylabs/documentation/dispatches`
3. Content type: `application/json`
4. Secret: (create a secret for webhook validation)
5. Events: Just the push event, with path filter for `data/**`

## Automatic Updates

Once configured, any change to governance team structures will automatically:
- ✅ Trigger a documentation rebuild
- ✅ Pull latest governance data
- ✅ Discover new projects with `docs = true`
- ✅ Remove projects that no longer have docs flag
- ✅ Deploy updated documentation

No manual intervention needed!
