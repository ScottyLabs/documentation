/**
 * Export Markdown alongside HTML for Accept: text/markdown content negotiation.
 * Run after astro build and write-redirects.
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import TurndownService from 'turndown';
import {
  filePathToUrlPath,
  loadRedirects,
} from './redirects.ts';

const CONTENT_DIR = 'src/content/docs';
const DIST_DIR = 'dist';
const SPECS_DIR = 'public/specs';

const SKIPPED_MARKDOWN_FILES = new Set(['SUMMARY.md', 'SUMMARY.mdx']);
const SKIPPED_AGENT_FILES = new Set(['AGENTS.md']);

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

interface ExportStats {
  source: number;
  redirects: number;
  htmlFallback: number;
  openapi: number;
  warnings: number;
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  return match ? content.slice(match[0].length).replace(/^\n+/, '') : content;
}

function shouldSkipMarkdownFile(name: string): boolean {
  return SKIPPED_MARKDOWN_FILES.has(name) || SKIPPED_AGENT_FILES.has(name);
}

async function resolveHtmlPath(urlPath: string): Promise<string | null> {
  const indexPath = urlPath
    ? join(DIST_DIR, urlPath, 'index.html')
    : join(DIST_DIR, 'index.html');

  try {
    await stat(indexPath);
    return indexPath;
  } catch {
    // Starlight emits some pages as flat .html (e.g. 404.html).
  }

  if (!urlPath) {
    return null;
  }

  const flatPath = join(DIST_DIR, `${urlPath}.html`);
  try {
    await stat(flatPath);
    return flatPath;
  } catch {
    return null;
  }
}

function markdownPathForHtml(htmlPath: string): string {
  return htmlToMarkdownCounterpart(htmlPath);
}

function titleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? 'Page';
}

function contentRelativeToUrlPath(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  const slash = normalized.indexOf('/');

  if (slash === -1) {
    const base = normalized.replace(/\.(md|mdx)$/i, '');
    if (base.toLowerCase() === 'index') {
      return '';
    }
    return base.toLowerCase();
  }

  const projectSlug = normalized.slice(0, slash).toLowerCase();
  const projectRelative = normalized.slice(slash + 1);
  return filePathToUrlPath(projectSlug, projectRelative);
}

function htmlToMarkdownCounterpart(htmlPath: string): string {
  const dir = dirname(htmlPath);
  const name = basename(htmlPath);
  if (name === 'index.html') {
    return join(dir, 'index.md');
  }
  return join(dir, name.replace(/\.html$/i, '.md'));
}

function stripHtmlChrome(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
}

function extractMainHtml(html: string): string {
  const markdownMatch = html.match(
    /<div[^>]*class="[^"]*sl-markdown-content[^"]*"[^>]*>([\s\S]*)/i
  );
  if (markdownMatch) {
    return markdownMatch[1];
  }

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return mainMatch[1];
  }

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return articleMatch[1];
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }

  return html;
}

async function writeMarkdownFile(path: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${trimmed}\n`);
}

async function exportFromSource(stats: ExportStats): Promise<void> {
  console.log('  Pass A: exporting from source markdown...');

  async function walk(dir: string, relativePrefix = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryRel = relativePrefix ? join(relativePrefix, entry.name) : entry.name;

      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), entryRel);
        continue;
      }

      if (!entry.isFile() || !/\.(md|mdx)$/i.test(entry.name)) {
        continue;
      }

      if (shouldSkipMarkdownFile(entry.name)) {
        continue;
      }

      const sourcePath = join(dir, entry.name);
      const urlPath = contentRelativeToUrlPath(entryRel);
      const htmlPath = await resolveHtmlPath(urlPath);
      if (!htmlPath) {
        continue;
      }

      const distMd = markdownPathForHtml(htmlPath);

      const content = await Bun.file(sourcePath).text();
      let body = stripFrontmatter(content);
      if (!body.trim() && entry.name === '404.md') {
        body =
          '# Page not found\n\nThat page does not exist. Check the URL or use search to find what you need.';
      }
      if (!body.trim()) {
        continue;
      }
      await writeMarkdownFile(distMd, body);
      stats.source += 1;
    }
  }

  await walk(CONTENT_DIR);
  console.log(`    ✓ ${stats.source} pages from source`);
}

async function exportRedirectStubs(stats: ExportStats): Promise<void> {
  console.log('  Pass B: writing redirect stubs...');

  const redirects = await loadRedirects();
  for (const { from, to } of redirects) {
    const htmlPath = join(DIST_DIR, from, 'index.html');
    try {
      await stat(htmlPath);
    } catch {
      continue;
    }

    const distMd = join(DIST_DIR, from, 'index.md');
    const body = `This page has moved to /${to}/.

[Go to the current page](/${to}/)`;
    await writeMarkdownFile(distMd, body);
    stats.redirects += 1;
  }

  console.log(`    ✓ ${stats.redirects} redirect stubs`);
}

function openapiToMarkdown(spec: Record<string, unknown>, slug: string): string {
  const lines: string[] = [`# ${slug} API Reference`, ''];

  const info = spec.info as Record<string, unknown> | undefined;
  if (info?.title) {
    lines[0] = `# ${info.title}`;
  }
  if (info?.description) {
    lines.push(String(info.description), '');
  }

  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) {
    return lines.join('\n');
  }

  for (const [path, methods] of Object.entries(paths)) {
    lines.push(`## ${path}`, '');
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters' || !operation || typeof operation !== 'object') {
        continue;
      }
      const op = operation as Record<string, unknown>;
      const summary = op.summary ? ` — ${op.summary}` : '';
      lines.push(`### ${method.toUpperCase()}${summary}`);
      if (op.description) {
        lines.push('', String(op.description));
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

async function exportOpenApiSummaries(stats: ExportStats): Promise<void> {
  try {
    await stat(SPECS_DIR);
  } catch {
    return;
  }

  const entries = await readdir(SPECS_DIR);
  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const slug = entry.replace(/\.json$/, '');
    const apiHtml = join(DIST_DIR, slug, 'api', 'index.html');
    try {
      await stat(apiHtml);
    } catch {
      continue;
    }

    const specPath = join(SPECS_DIR, entry);
    try {
      const spec = JSON.parse(await Bun.file(specPath).text()) as Record<string, unknown>;
      const body = openapiToMarkdown(spec, slug);
      await writeMarkdownFile(join(DIST_DIR, slug, 'api', 'index.md'), body);
      stats.openapi += 1;
    } catch {
      stats.warnings += 1;
    }
  }

  if (stats.openapi > 0) {
    console.log(`    ✓ ${stats.openapi} OpenAPI summaries`);
  }
}

async function exportFromHtml(stats: ExportStats): Promise<void> {
  console.log('  Pass C: HTML fallback for pages without source markdown...');

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.html')) {
        continue;
      }

      const mdPath = htmlToMarkdownCounterpart(fullPath);
      try {
        await stat(mdPath);
        continue;
      } catch {
        // no counterpart yet
      }

      try {
        const html = await Bun.file(fullPath).text();
        const extracted = extractMainHtml(stripHtmlChrome(html));
        let markdown = turndown.turndown(extracted).trim();
        if (!markdown) {
          markdown = `# ${titleFromHtml(html)}\n\nThis page has no Markdown content export.`;
        }
        await writeMarkdownFile(mdPath, markdown);
        stats.htmlFallback += 1;
      } catch {
        stats.warnings += 1;
      }
    }
  }

  await walk(DIST_DIR);
  console.log(`    ✓ ${stats.htmlFallback} pages from HTML fallback`);
  if (stats.warnings > 0) {
    console.log(`    ⚠ ${stats.warnings} pages could not be converted`);
  }
}

async function main(): Promise<void> {
  console.log('\n📝 Exporting Markdown for Accept: text/markdown...\n');

  try {
    await stat(DIST_DIR);
  } catch {
    console.error('❌ dist/ not found — run astro build first');
    process.exit(1);
  }

  const stats: ExportStats = {
    source: 0,
    redirects: 0,
    htmlFallback: 0,
    openapi: 0,
    warnings: 0,
  };

  await exportFromSource(stats);
  await exportRedirectStubs(stats);
  await exportOpenApiSummaries(stats);
  await exportFromHtml(stats);

  const total = stats.source + stats.redirects + stats.htmlFallback + stats.openapi;
  console.log(`\n✅ Markdown export complete (${total} pages)\n`);
}

await main();
