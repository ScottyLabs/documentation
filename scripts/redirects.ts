import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface Redirect {
  /** Site path without leading/trailing slashes, e.g. `tartan-vote/CONTRIBUTING` */
  from: string;
  /** Site path without leading/trailing slashes, e.g. `tartan-vote/contributing` */
  to: string;
}

export const REDIRECTS_FILE = '.build/redirects.json';

export function normalizeEntryName(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) {
    return name.toLowerCase();
  }
  return `${name.slice(0, dot).toLowerCase()}${name.slice(dot).toLowerCase()}`;
}

/** Convert a docs-relative file path to the Starlight URL path (no leading/trailing slash). */
export function filePathToUrlPath(projectSlug: string, relativePath: string): string {
  const withoutExt = relativePath.replace(/\.(md|mdx)$/i, '');
  const segments = withoutExt.split(/[/\\]/).map((part) => part.toLowerCase());

  if (segments.at(-1) === 'index') {
    segments.pop();
  }

  return [projectSlug, ...segments].filter(Boolean).join('/');
}

/** Legacy URL path preserving source casing (for redirects from old links). */
export function legacyFilePathToUrlPath(projectSlug: string, relativePath: string): string {
  const withoutExt = relativePath.replace(/\.(md|mdx)$/i, '');
  const segments = withoutExt.split(/[/\\]/);

  if (segments.at(-1)?.toLowerCase() === 'index') {
    segments.pop();
    const parent = segments.join('/');
    return parent ? `${projectSlug}/${parent}/index` : `${projectSlug}/index`;
  }

  return [projectSlug, ...segments].filter(Boolean).join('/');
}

export function recordFileRedirects(
  redirects: Redirect[],
  projectSlug: string,
  sourceRelativePath: string,
  normalizedRelativePath: string
): void {
  const from = legacyFilePathToUrlPath(projectSlug, sourceRelativePath);
  const to = filePathToUrlPath(projectSlug, normalizedRelativePath);

  if (from !== to) {
    addRedirect(redirects, from, to);
  }

  if (/^index\.(md|mdx)$/i.test(sourceRelativePath.split(/[/\\]/).pop() ?? '')) {
    const legacyIndex = legacyFilePathToUrlPath(projectSlug, sourceRelativePath);
    if (legacyIndex !== to) {
      addRedirect(redirects, legacyIndex, to);
    }
  }
}

export function addRedirect(redirects: Redirect[], from: string, to: string): void {
  const normalizedFrom = from.replace(/^\/+|\/+$/g, '');
  const normalizedTo = to.replace(/^\/+|\/+$/g, '');
  if (normalizedFrom === normalizedTo) {
    return;
  }
  if (!redirects.some((entry) => entry.from === normalizedFrom)) {
    redirects.push({ from: normalizedFrom, to: normalizedTo });
  }
}

export function rewriteMarkdownLinks(body: string): string {
  return body.replace(
    /\[([^\]]*)\]\(([^)#\s]+)(#[^)]*)?\)/g,
    (match, text: string, path: string, hash?: string) => {
      if (/^(https?:|mailto:|\/)/.test(path)) {
        return match;
      }
      if (!/\.mdx?$/i.test(path)) {
        return match;
      }

      const normalized = normalizeMarkdownLink(path);
      return `[${text}](${normalized}${hash ?? ''})`;
    }
  );
}

function normalizeMarkdownLink(path: string): string {
  const segments = path.split('/');

  const normalized = segments.map((segment, index) => {
    if (index === segments.length - 1 && /\.mdx?$/i.test(segment)) {
      const base = segment.replace(/\.mdx?$/i, '');
      if (base.toLowerCase() === 'index') {
        return 'index';
      }
      return base.toLowerCase();
    }
    return segment.toLowerCase();
  });

  const last = normalized.at(-1);
  if (last === 'index') {
    normalized.pop();
    const joined = normalized.join('/');
    return joined ? `${joined}/` : './';
  }

  return `${normalized.join('/')}/`;
}

export async function saveRedirects(redirects: Redirect[]): Promise<void> {
  await mkdir(dirname(REDIRECTS_FILE), { recursive: true });
  await writeFile(REDIRECTS_FILE, JSON.stringify(redirects, null, 2));
}

export async function loadRedirects(): Promise<Redirect[]> {
  try {
    const raw = await readFile(REDIRECTS_FILE, 'utf-8');
    return JSON.parse(raw) as Redirect[];
  } catch {
    return [];
  }
}

function redirectHtml(targetPath: string): string {
  const href = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const url = href.endsWith('/') ? href : `${href}/`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${url}" />
    <link rel="canonical" href="${url}" />
    <title>Redirecting…</title>
    <script>location.replace(${JSON.stringify(url)})</script>
  </head>
  <body></body>
</html>
`;
}

export async function writeRedirectPages(distDir = 'dist'): Promise<void> {
  const redirects = await loadRedirects();
  if (redirects.length === 0) {
    return;
  }

  console.log(`\n↪️  Writing ${redirects.length} legacy URL redirects...\n`);

  for (const { from, to } of redirects) {
    const target = `/${to}/`;
    const outputPath = join(distDir, from, 'index.html');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, redirectHtml(target));
    console.log(`  ✓ /${from}/ → ${target}`);
  }

  console.log('\n✅ Legacy redirects written\n');
}
