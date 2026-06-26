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
} from './manifest.ts';
import { getRepoPath } from './clone-repos.ts';
import {
  type Redirect,
  normalizeEntryName,
  recordFileRedirects,
  rewriteMarkdownLinks,
  saveRedirects,
} from './redirects.ts';
import { applyScottyLabsRedirects } from './scottylabs-redirects.ts';

const CONTENT_DIR = 'src/content/docs';

let aggregationRedirects: Redirect[] = [];

/** mdBook and similar tools use these as navigation metadata, not pages. */
const SKIPPED_MARKDOWN_FILES = new Set(['SUMMARY.md', 'SUMMARY.mdx']);

/** README files in docs/ should be skipped since we use the root README as fallback homepage. */
const SKIPPED_INDEX_FILES = new Set(['README.md', 'readme.md']);

/** AI agent context ([agents.md](https://agents.md/)); repo-local only, not published pages. */
const SKIPPED_AGENT_FILES = new Set(['AGENTS.md']);

/** Starlight site shell, not project documentation. */
const SKIPPED_SHELL_FILES = new Set(['index.mdx', 'getting-started.md', '404.md']);

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

  applyScottyLabsRedirects(aggregationRedirects);
  await saveRedirects(aggregationRedirects);
  
  console.log('✅ Documentation aggregated\n');
}

/**
 * Aggregate documentation from a single project
 */
async function aggregateProjectDocs(project: Project): Promise<void> {
  console.log(`  Processing ${project.name}...`);
  
  const repoPath = isDocumentationHubProject(project) ? '.' : getRepoPath(project.slug);
  const sourceDocs = join(repoPath, resolveProjectDocsDir(project));
  const targetDocs = join(CONTENT_DIR, project.slug);

  if (isDocumentationHubProject(project) && sourceDocs.replace(/\\/g, '/').includes('src/content')) {
    console.warn(`  ⚠️  Refusing to aggregate Starlight shell from ${sourceDocs}`);
    return;
  }
  
  // Check if docs directory exists
  let hasDocsDir = false;
  try {
    await stat(sourceDocs);
    hasDocsDir = true;
  } catch {
    // No docs directory - that's okay, we'll just use README if available
  }
  
  // Replace project docs each build so renamed/lowercased files do not linger.
  await rm(targetDocs, { recursive: true, force: true });
  await mkdir(targetDocs, { recursive: true });
  
  // Copy all markdown files from docs directory if it exists
  if (hasDocsDir) {
    await copyMarkdownFiles(sourceDocs, targetDocs, project);
  }
  
  // Check if docs directory already has an index file
  const hasIndex = await hasIndexFile(targetDocs);
  
  if (!hasIndex) {
    // If no index exists, use README.md from repo root as the homepage
    const readmePath = join(repoPath, 'README.md');
    try {
      await stat(readmePath);
      const indexPath = join(targetDocs, 'index.md');
      await processMarkdownFile(readmePath, indexPath, project, 'README.md');
      console.log(`  ✓ Using README.md as homepage for ${project.name}`);
    } catch {
      if (!hasDocsDir) {
        console.warn(`  ⚠️  No docs directory or README.md found for ${project.name}`);
        return;
      }
      console.warn(`  ⚠️  No README.md found at ${readmePath}, skipping homepage`);
    }
  } else {
    console.log(`  ✓ Using existing index.md as homepage for ${project.name}`);
  }
  
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
      await processMarkdownFile(sourcePath, targetPath, project, normalizedRelativePath);
    }
  }
}

/**
 * Check if a directory has an index.md or index.mdx file
 */
async function hasIndexFile(dir: string): Promise<boolean> {
  for (const filename of ['index.md', 'index.mdx']) {
    try {
      await stat(join(dir, filename));
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function isAggregateableMarkdown(name: string, project: Project): boolean {
  if (!name.endsWith('.md') && !name.endsWith('.mdx')) {
    return false;
  }
  if (SKIPPED_MARKDOWN_FILES.has(name) || SKIPPED_AGENT_FILES.has(name) || SKIPPED_INDEX_FILES.has(name)) {
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

/** Remove a leading H1 when it duplicates the page title (Starlight renders title separately). */
function stripLeadingDuplicateH1(body: string, title: string): string {
  const match = body.match(/^#\s+(.+?)\s*(?:\n|$)/);
  if (!match) {
    return body;
  }

  const heading = match[1].replace(/\s*\{#.*\}$/, '').trim();
  if (heading.toLowerCase() !== title.toLowerCase()) {
    return body;
  }

  return body.slice(match[0].length).replace(/^\n+/, '');
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
  project: Project,
  sourceRelativePath: string
): Promise<void> {
  const content = await Bun.file(sourcePath).text();
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  const existingFrontmatter = frontmatterMatch?.[1] ?? '';
  const rawBody = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
  const body = rewriteMarkdownLinks(rawBody, {
    projectSlug: project.slug,
    repo: project.repo,
    docsDir: resolveProjectDocsDir(project),
    sourceRelativePath,
  });
  const title =
    titleFromFrontmatter(existingFrontmatter) ?? deriveTitle(body, basename(sourcePath));
  const frontmatter = buildFrontmatter(existingFrontmatter, title, project);
  const trimmedBody = stripLeadingDuplicateH1(body, title);

  await Bun.write(targetPath, `---\n${frontmatter}\n---\n${trimmedBody}`);
}

/**
 * Clean up aggregated documentation, preserving Starlight shell pages at the content root.
 */
export async function cleanDocs(): Promise<void> {
  console.log('🧹 Cleaning up aggregated documentation...');

  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await rm(join(CONTENT_DIR, entry.name), { recursive: true, force: true });
    }
  }

  console.log('✅ Documentation cleaned');
}
