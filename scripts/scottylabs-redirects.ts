import { addRedirect, type Redirect } from './redirects.ts';

/** Legacy flat URLs under /scottylabs/ after org-docs folder reorganization. */
const SCOTTYLABS_PATH_MIGRATIONS: ReadonlyArray<[from: string, to: string]> = [
  ['scottylabs/codeberg-setup', 'scottylabs/onboarding/codeberg-setup'],
  ['scottylabs/contributing', 'scottylabs/onboarding/contributing'],
  ['scottylabs/labrador-to-tech', 'scottylabs/onboarding/labrador-to-tech'],
  ['scottylabs/pr-process', 'scottylabs/development/pr-process'],
  ['scottylabs/ai-code-reviewers', 'scottylabs/development/ai-code-reviewers'],
  ['scottylabs/deprecation-guideline', 'scottylabs/development/deprecation-guideline'],
  ['scottylabs/credentials', 'scottylabs/platform/credentials'],
  ['scottylabs/github-orgs', 'scottylabs/platform/github-orgs'],
  ['scottylabs/emails', 'scottylabs/platform/emails'],
  ['scottylabs/communication', 'scottylabs/community/communication'],
  ['scottylabs/resources', 'scottylabs/community/resources'],
  ['scottylabs/design-system', 'scottylabs/design/design-system'],
  ['scottylabs/diagramming', 'scottylabs/design/diagramming'],
  ['scottylabs/projects', 'scottylabs/organization/projects'],
];

export function applyScottyLabsRedirects(redirects: Redirect[]): void {
  for (const [from, to] of SCOTTYLABS_PATH_MIGRATIONS) {
    addRedirect(redirects, from, to);
  }
}
