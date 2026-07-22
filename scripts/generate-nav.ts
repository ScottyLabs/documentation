/**
 * Navigation generation — writes src/content/docs/SUMMARY.md for mdbook.
 * Organisation mirrors the old Starlight sidebar: scottylabs slug is promoted
 * first, then all other starlight-type projects in discovery order.
 */

import { writeFile, stat } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';

const CONTENT_DIR = 'src/content/docs';

/**
 * Generate SUMMARY.md from the aggregated project docs.
 */
export async function generateNavigation(projects: Project[]): Promise<void> {
  console.log(`\n🧭 Generating SUMMARY.md...\n`);

  const lines: string[] = ['# Summary', ''];

  // Welcome section — shell pages at the content root
  lines.push('- [Home](index.md)');
  try {
    await stat(join(CONTENT_DIR, 'getting-started.md'));
    lines.push('- [Getting Started](getting-started.md)');
  } catch { /* file absent */ }
  lines.push('');
  lines.push('---');
  lines.push('');

  // scottylabs org docs first, then everything else in discovery order
  const sorted = [...projects].sort((a, b) => {
    if (a.slug === 'scottylabs') return -1;
    if (b.slug === 'scottylabs') return 1;
    return 0;
  });

  for (const project of sorted) {
    const entry = await projectEntry(project);
    if (entry) lines.push(entry);
  }

  const summary = lines.join('\n') + '\n';
  await writeFile(join(CONTENT_DIR, 'SUMMARY.md'), summary);
  console.log('✅ SUMMARY.md generated\n');
}

// ── Per-project entry ──────────────────────────────────────────────────────

async function projectEntry(project: Project): Promise<string | null> {
  // Only starlight-type projects have aggregated markdown pages
  if (project.type !== 'starlight') return null;

  const dir = join(CONTENT_DIR, project.slug);
  try {
    await stat(dir);
  } catch {
    return null;
  }

  if (!(await directoryHasMarkdown(dir))) return null;

  const label = await sidebarGroupLabel(project);
  const subLines = await summaryLines(project.slug, dir, '  ');

  // If no index.md exists, emit a draft chapter (no link) to avoid mdbook errors
  const hasIndex = await directoryHasIndex(dir);
  const root = hasIndex
    ? `- [${label}](${project.slug}/index.md)`
    : `- [${label}]()`;
  return subLines.length > 0 ? root + '\n' + subLines.join('\n') : root;
}

// ── Recursive directory walker ─────────────────────────────────────────────

/**
 * Return SUMMARY.md lines for all markdown files under `dir`, skipping index
 * files (they are the section root linked by the parent entry).
 *
 * @param slug      Project slug — used to build the path relative to CONTENT_DIR
 * @param dir       Absolute or CWD-relative path to scan
 * @param indent    Indentation prefix for this depth level
 * @param relPath   Path relative to the project slug dir (for sub-dirs)
 */
async function summaryLines(
  slug: string,
  dir: string,
  indent: string,
  relPath = '',
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const lines: string[] = [];

  // Directories first, then files, both alphabetical
  const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter(e => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx')))
    .filter(e => e.name !== 'index.md' && e.name !== 'index.mdx')
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const d of dirs) {
    const subDir = join(dir, d.name);
    const subRel = relPath ? `${relPath}/${d.name}` : d.name;
    const hasIndex = await directoryHasIndex(subDir);
    const subLines = await summaryLines(slug, subDir, indent + '  ', subRel);

    const indexPath = `${slug}/${subRel}/index.md`;
    const subLabel = formatLabel(d.name);

    if (hasIndex) {
      lines.push(`${indent}- [${subLabel}](${indexPath})`);
    } else {
      // Draft chapter — no index file, but has content below
      lines.push(`${indent}- [${subLabel}]()`);
    }
    lines.push(...subLines);
  }

  for (const f of files) {
    const nameNoExt = f.name.replace(/\.(md|mdx)$/, '');
    const filePath = relPath
      ? `${slug}/${relPath}/${nameNoExt}.md`
      : `${slug}/${nameNoExt}.md`;
    lines.push(`${indent}- [${formatLabel(nameNoExt)}](${filePath})`);
  }

  return lines;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function directoryHasMarkdown(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) return true;
      if (e.isDirectory() && (await directoryHasMarkdown(join(dir, e.name)))) return true;
    }
  } catch { /* dir absent */ }
  return false;
}

async function directoryHasIndex(dir: string): Promise<boolean> {
  for (const name of ['index.md', 'index.mdx']) {
    try {
      await stat(join(dir, name));
      return true;
    } catch { /* absent */ }
  }
  return false;
}

function formatLabel(name: string): string {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Read H1 from the aggregated index.md as the sidebar group label. */
async function sidebarGroupLabel(project: Project): Promise<string> {
  const indexPath = join(CONTENT_DIR, project.slug, 'index.md');
  try {
    const text = await Bun.file(indexPath).text();
    // Strip frontmatter if any slipped through, then look for H1
    const body = text.replace(/^---[\s\S]*?\n---\n/, '');
    const h1 = body.match(/^#\s+(.+?)(?:\s*\{#[^}]*\})?\s*$/m);
    if (h1) return h1[1].trim();
  } catch { /* absent */ }
  return project.name;
}
