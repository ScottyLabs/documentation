const SCOTTYLABS_CODEBERG = 'https://codeberg.org/ScottyLabs';
const SCOTTYLABS_GITHUB = 'https://github.com/ScottyLabs';
const DOCS_HUB_SLUG = 'documentation';

export type RepoPlatform = 'codeberg' | 'github';

export interface RepoLink {
  platform: RepoPlatform;
  url: string;
}

export interface RepoLinksResult {
  slug: string;
  links: RepoLink[];
}

interface ParsedRepo {
  platform: RepoPlatform | 'other';
  org: string;
  name: string;
  url: string;
}

function slugFromRepoUrl(repo: string): string {
  const normalized = repo.replace(/\.git$/, '').replace(/\/$/, '');
  return normalized.split('/').pop() ?? DOCS_HUB_SLUG;
}

function parseRepoUrl(repo: string): ParsedRepo {
  const url = repo.replace(/\.git$/, '').replace(/\/$/, '');

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const org = parts[0] ?? '';
    const name = parts[1] ?? '';

    if (parsed.hostname.includes('codeberg.org')) {
      return { platform: 'codeberg', org, name, url };
    }
    if (parsed.hostname.includes('github.com')) {
      return { platform: 'github', org, name, url };
    }

    return { platform: 'other', org, name, url };
  } catch {
    return { platform: 'other', org: '', name: slugFromRepoUrl(repo), url };
  }
}

function scottyLabsMirror(
  parsed: ParsedRepo
): RepoLink | undefined {
  if (parsed.org.toLowerCase() !== 'scottylabs' || !parsed.name) {
    return undefined;
  }

  if (parsed.platform === 'codeberg') {
    return { platform: 'github', url: `${SCOTTYLABS_GITHUB}/${parsed.name}` };
  }

  if (parsed.platform === 'github') {
    return { platform: 'codeberg', url: `${SCOTTYLABS_CODEBERG}/${parsed.name}` };
  }

  return undefined;
}

function projectSlugFromEntry(entry: {
  data: { project?: string; repo?: string };
  slug: string;
}): string {
  if (entry.data.project) {
    return entry.data.project;
  }

  if (entry.data.repo) {
    return slugFromRepoUrl(entry.data.repo);
  }

  const slug = entry.slug.replace(/\/$/, '');
  if (slug === 'index' || slug === 'getting-started') {
    return DOCS_HUB_SLUG;
  }

  const firstSegment = slug.split('/')[0];
  return firstSegment || DOCS_HUB_SLUG;
}

function defaultScottyLabsLinks(slug: string): RepoLink[] {
  return [
    { platform: 'codeberg', url: `${SCOTTYLABS_CODEBERG}/${slug}` },
    { platform: 'github', url: `${SCOTTYLABS_GITHUB}/${slug}` },
  ];
}

function linksFromCanonicalRepo(repo: string): RepoLink[] {
  const parsed = parseRepoUrl(repo);
  const links: RepoLink[] = [];

  if (parsed.platform === 'codeberg' || parsed.platform === 'github') {
    links.push({ platform: parsed.platform, url: parsed.url });
    const mirror = scottyLabsMirror(parsed);
    if (mirror && mirror.url !== parsed.url) {
      links.push(mirror);
    }
    return links;
  }

  return [{ platform: 'codeberg', url: parsed.url }];
}

export function repoLinksFromEntry(entry: {
  data: { project?: string; repo?: string };
  slug: string;
}): RepoLinksResult {
  const slug = projectSlugFromEntry(entry);

  if (entry.data.repo) {
    return { slug, links: linksFromCanonicalRepo(entry.data.repo) };
  }

  return { slug, links: defaultScottyLabsLinks(slug) };
}
