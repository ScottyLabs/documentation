/**
 * Documentation aggregation utilities
 * Handles copying and merging markdown content from projects
 */

import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Project } from './manifest.ts';
import {
  isDocumentationHubProject,
  resolveProjectDocsDir,
  resolveProjectRepoRoot,
} from './manifest.ts';
import {
  type Redirect,
  normalizeEntryName,
  recordFileRedirects,
  rewriteMarkdownLinks,
  saveRedirects,
} from './redirects.ts';

const CONTENT_DIR = 'src/content/docs';

let aggregationRedirects: Redirect[] = [];

/** mdBook and similar tools use these as navigation metadata, not pages. */
const SKIPPED_MARKDOWN_FILES = new Set(['SUMMARY.md', 'SUMMARY.mdx']);

/** Starlight site shell — not project documentation. */
const SKIPPED_SHELL_FILES = new Set(['index.mdx', 'getting-started.md']);

/**
 * Aggregate documentation from all Starlight projects
 */
export async function aggregateStarlightDocs(projects: Project[]): Promise<void> {
  console.log(`\n📚 Aggregating Starlight documentation...\n`);

  aggregationRedirects = [];
  
  const starlightProjects = projects.filter(p => p.type === 'starlight');
  
  for (const project of starlightProjects) {
    await aggregateProjectDocs(project);
  }

  await saveRedirects(aggregationRedirects);
  
  console.log('✅ Documentation aggregated\n');
}

/**
 * Aggregate documentation from a single project
 */
async function aggregateProjectDocs(project: Project): Promise<void> {
  console.log(`  Processing ${project.name}...`);
  
  const repoPath = resolveProjectRepoRoot(project);
  const sourceDocs = join(repoPath, resolveProjectDocsDir(project));
  const targetDocs = join(CONTENT_DIR, project.slug);

  if (isDocumentationHubProject(project) && sourceDocs.replace(/\\/g, '/').includes('src/content')) {
    console.warn(`  ⚠️  Refusing to aggregate Starlight shell from ${sourceDocs}`);
    return;
  }
  
  // Check if docs directory exists
  try {
    await stat(sourceDocs);
  } catch {
    console.warn(`  ⚠️  No docs directory found at ${sourceDocs}`);
    return;
  }
  
  // Replace project docs each build so renamed/lowercased files do not linger.
  await rm(targetDocs, { recursive: true, force: true });
  await mkdir(targetDocs, { recursive: true });
  
  // Copy all markdown files
  await copyMarkdownFiles(sourceDocs, targetDocs, project);
  
  console.log(`  ✓ ${project.name} docs copied to ${targetDocs}`);
}

/**
 * Recursively copy markdown files, processing frontmatter
 */
async function copyMarkdownFiles(
  source: string,
  target: string,
  project: Project,
  relativePath = ''
): Promise<void> {
  const entries = await readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const normalizedName = normalizeEntryName(entry.name);
    const targetPath = join(target, normalizedName);
    const entryRelativePath = join(relativePath, entry.name);
    const normalizedRelativePath = join(relativePath, normalizedName);
    
    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyMarkdownFiles(sourcePath, targetPath, project, entryRelativePath);
    } else if (entry.isFile() && isAggregateableMarkdown(entry.name, project)) {
      recordFileRedirects(
        aggregationRedirects,
        project.slug,
        entryRelativePath,
        normalizedRelativePath
      );
      await processMarkdownFile(sourcePath, targetPath, project);
    }
  }
}

function isAggregateableMarkdown(name: string, project: Project): boolean {
  if (!name.endsWith('.md') && !name.endsWith('.mdx')) {
    return false;
  }
  if (SKIPPED_MARKDOWN_FILES.has(name)) {
    return false;
  }
  if (isDocumentationHubProject(project) && SKIPPED_SHELL_FILES.has(name)) {
    return false;
  }
  return true;
}

function formatLabel(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function deriveTitle(body: string, filename: string): string {
  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  if (h1) {
    return h1[1].replace(/\s*\{#.*\}$/, '').trim();
  }

  const base = basename(filename).replace(/\.(md|mdx)$/, '');
  if (base.toLowerCase() === 'index' || base.toLowerCase() === 'readme') {
    return 'Overview';
  }

  return formatLabel(base);
}

function stripFrontmatterKeys(frontmatter: string, keys: string[]): string {
  const pattern = new RegExp(`^(${keys.join('|')}):.*(?:\\n|$)`, 'gm');
  return frontmatter.replace(pattern, '').trim();
}

function buildFrontmatter(
  existingFrontmatter: string,
  title: string,
  project: Project
): string {
  const preserved = stripFrontmatterKeys(existingFrontmatter, ['title', 'project', 'projectType', 'repo']);

  return [
    `title: ${JSON.stringify(title)}`,
    preserved,
    `project: ${JSON.stringify(project.slug)}`,
    `projectType: ${JSON.stringify(project.type)}`,
    `repo: ${JSON.stringify(project.repo)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function titleFromFrontmatter(frontmatter: string): string | undefined {
  const match = frontmatter.match(/^title:\s*(.+)$/m);
  if (!match) {
    return undefined;
  }

  const raw = match[1].trim();
  if (raw.startsWith('"') || raw.startsWith("'")) {
    try {
      return JSON.parse(raw.replace(/^'/, '"').replace(/'$/, '"'));
    } catch {
      return raw.replace(/^['"]|['"]$/g, '');
    }
  }

  return raw;
}

/**
 * Process and copy a single markdown file, adding project metadata
 */
async function processMarkdownFile(
  sourcePath: string,
  targetPath: string,
  project: Project
): Promise<void> {
  const content = await Bun.file(sourcePath).text();
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  const existingFrontmatter = frontmatterMatch?.[1] ?? '';
  const rawBody = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
  const body = rewriteMarkdownLinks(rawBody);
  const title =
    titleFromFrontmatter(existingFrontmatter) ?? deriveTitle(body, basename(sourcePath));
  const frontmatter = buildFrontmatter(existingFrontmatter, title, project);

  await Bun.write(targetPath, `---\n${frontmatter}\n---\n${body}`);
}

/**
 * Clean up aggregated documentation
 */
export async function cleanDocs(): Promise<void> {
  console.log('🧹 Cleaning up aggregated documentation...');
  
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory() && !['getting-started.md', 'index.mdx'].includes(entry.name)) {
      const dirPath = join(CONTENT_DIR, entry.name);
      const proc = Bun.spawn(['rm', '-rf', dirPath], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await proc.exited;
    }
  }
  
  console.log('✅ Documentation cleaned');
}
