import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export interface Redirect {
  /** Site path without leading/trailing slashes, e.g. `tartan-vote/CONTRIBUTING` */
  from: string;
  /** Site path without leading/trailing slashes, e.g. `tartan-vote/contributing` */
  to: string;
}

export interface LinkRewriteContext {
  projectSlug: string;
  repo: string;
  docsDir: string;
  /** Path of the markdown file relative to the project's docs directory */
  sourceRelativePath: string;
}

export const REDIRECTS_FILE = '.build/redirects.json';

const MARKDOWN_EXTENSION = /\.mdx?$/i;
const REPO_FILE_EXTENSION = /\.(nix|tf|yaml|yml|json|age|rs|toml|example)$/i;
const NON_DOMAIN_TLDS = new Set([
  'md',
  'mdx',
  'json',
  'yaml',
  'yml',
  'nix',
  'tf',
  'rs',
  'toml',
  'age',
  'example',
  'txt',
  'csv',
  'pdf',
]);

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

function looksLikeExternalUrl(path: string): boolean {
  const host = path.split('/')[0];
  const match = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.([a-zA-Z]{2,})$/.exec(host);
  if (!match) {
    return false;
  }
  return !NON_DOMAIN_TLDS.has(match[1].toLowerCase());
}

function resolveRelativePath(baseDir: string, linkPath: string): string {
  const normalizedBase = baseDir === '.' ? '' : baseDir;
  const baseParts = normalizedBase.split(/[/\\]/).filter(Boolean);
  const linkParts = linkPath.split('/').filter((part) => part !== '');

  for (const part of linkParts) {
    if (part === '.') {
      continue;
    }
    if (part === '..') {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

function repoBlobUrl(repo: string, repoRelativePath: string): string {
  const base = repo.replace(/\.git$/, '');
  return `${base}/src/branch/main/${repoRelativePath}`;
}

function resolveRepoPath(context: LinkRewriteContext, linkPath: string): string {
  const pathPart = linkPath.split('#')[0].replace(/\/$/, '');
  const docFileInRepo = join(context.docsDir, context.sourceRelativePath).replace(/\\/g, '/');
  const docDir = dirname(docFileInRepo);

  // Repo-root paths linked from docs/ often omit ../ (e.g. schemas/team.schema.json).
  if (/^schemas\//.test(pathPart) && !pathPart.includes('..')) {
    return resolveRelativePath(docDir, `../${pathPart}`);
  }

  return resolveRelativePath(docDir, pathPart);
}

function resolveDocPath(sourceRelativePath: string, linkPath: string): string {
  const pathPart = linkPath.split('#')[0].replace(/\/$/, '').replace(MARKDOWN_EXTENSION, '');
  const sourceDir = dirname(sourceRelativePath).replace(/\\/g, '/');
  return resolveRelativePath(sourceDir, pathPart.replace(/^docs\//, ''));
}

function isDocLink(context: LinkRewriteContext, linkPath: string): boolean {
  const pathPart = linkPath.split('#')[0].replace(/\/$/, '');

  if (REPO_FILE_EXTENSION.test(pathPart)) {
    return false;
  }

  const docDirInRepo = join(context.docsDir, dirname(context.sourceRelativePath)).replace(/\\/g, '/');
  const resolvedRepoPath = resolveRelativePath(
    docDirInRepo,
    pathPart.replace(/^docs\//, '')
  );
  const docsRoot = context.docsDir.replace(/\\/g, '/');

  return resolvedRepoPath === docsRoot || resolvedRepoPath.startsWith(`${docsRoot}/`);
}

function toSitePath(projectSlug: string, docRelativePath: string, hash?: string): string {
  const withExt = MARKDOWN_EXTENSION.test(docRelativePath) ? docRelativePath : `${docRelativePath}.md`;
  const urlPath = filePathToUrlPath(projectSlug, withExt);
  return `/${urlPath}/${hash ?? ''}`;
}

export function rewriteMarkdownLinks(body: string, context?: LinkRewriteContext): string {
  return body.replace(
    /\[([^\]]*)\]\(([^)#\s]+)(#[^)]*)?\)/g,
    (match, text: string, path: string, hash?: string) => {
      const hashSuffix = hash ?? '';

      if (/^(https?:|mailto:|tel:|\/)/.test(path)) {
        return match;
      }

      if (looksLikeExternalUrl(path)) {
        return `[${text}](https://${path}${hashSuffix})`;
      }

      if (!context) {
        if (!MARKDOWN_EXTENSION.test(path)) {
          return match;
        }
        const normalized = normalizeMarkdownLink(path);
        return `[${text}](${normalized}${hashSuffix})`;
      }

      if (isDocLink(context, path)) {
        const docPath = resolveDocPath(context.sourceRelativePath, path);
        const sourceBase = basename(context.sourceRelativePath)
          .replace(MARKDOWN_EXTENSION, '')
          .toLowerCase();
        const targetBase = basename(docPath).replace(MARKDOWN_EXTENSION, '').toLowerCase();

        if (targetBase === sourceBase) {
          return hashSuffix ? `[${text}](${hashSuffix})` : match;
        }

        return `[${text}](${toSitePath(context.projectSlug, docPath, hashSuffix)})`;
      }

      const repoPath = resolveRepoPath(context, path);
      return `[${text}](${repoBlobUrl(context.repo, repoPath)}${hashSuffix})`;
    }
  );
}

function normalizeMarkdownLink(path: string): string {
  const segments = path.split('/');

  const normalized = segments.map((segment, index) => {
    if (index === segments.length - 1 && MARKDOWN_EXTENSION.test(segment)) {
      const base = segment.replace(MARKDOWN_EXTENSION, '');
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
