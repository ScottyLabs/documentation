/**
 * Repository cloning utilities
 * Resolves project checkouts from monorepo siblings or shallow clones.
 */

import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';
import { isDocumentationHubProject } from './manifest.ts';

const REPOS_DIR = '.repos';

/** Populated by resolveAllRepoRoots before aggregation. */
const resolvedRepoRoots = new Map<string, string>();

/**
 * Resolve and clone all external project repositories.
 * Prefers sibling directories in a monorepo (e.g. ../infrastructure) over cloning.
 */
export async function resolveAllRepoRoots(projects: Project[]): Promise<void> {
  resolvedRepoRoots.clear();

  const external = projects.filter((project) => !isDocumentationHubProject(project));
  console.log(`\n📦 Resolving ${external.length} project repositories...\n`);

  await mkdir(REPOS_DIR, { recursive: true });

  for (const project of external) {
    await resolveProjectRepoRoot(project);
  }

  console.log('\n✅ All project repositories resolved\n');
}

async function resolveProjectRepoRoot(project: Project): Promise<void> {
  const siblingPath = join('..', project.slug);
  if (await isUsableCheckout(siblingPath)) {
    resolvedRepoRoots.set(project.slug, siblingPath);
    console.log(`  ✓ ${project.name} (${project.slug}) → monorepo ${siblingPath}`);
    return;
  }

  try {
    await ensureRepoCloned(project.repo, project.slug, project.name);
    resolvedRepoRoots.set(project.slug, getRepoPath(project.slug));
  } catch (err) {
    // Private repos or no network: skip gracefully so local dev still produces a site
    console.warn(`  ⚠️  Skipping ${project.name} (${project.slug}): ${(err as Error).message.split('\n')[0]}`);
  }
}

async function isUsableCheckout(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      return false;
    }

    const entries = await readdir(path);
    return entries.some((entry) => entry !== '.git');
  } catch {
    return false;
  }
}

/**
 * Clone a repository if it is not already present under .repos/<slug>.
 */
export async function ensureRepoCloned(
  repoUrl: string,
  slug: string,
  displayName = slug
): Promise<void> {
  const repoPath = getRepoPath(slug);

  if (await isRepoCloned(slug)) {
    console.log(`  ✓ ${displayName} (${slug}) already cloned`);
    return;
  }

  try {
    await stat(repoPath);
    await rm(repoPath, { recursive: true, force: true });
  } catch {
    // Directory does not exist yet.
  }

  console.log(`  Cloning ${displayName} (${slug})...`);

  const proc = Bun.spawn(
    ['git', 'clone', '--depth', '1', '--single-branch', repoUrl, repoPath],
    {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'null',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }
  );

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Git clone failed for ${slug}: ${stderr}`);
  }

  console.log(`  ✓ ${displayName} cloned`);
}

/**
 * Filesystem root for a project during build (after resolveAllRepoRoots).
 */
export function getRepoPath(slug: string): string {
  const resolved = resolvedRepoRoots.get(slug);
  if (resolved) {
    return resolved;
  }
  return join(REPOS_DIR, slug);
}

/**
 * Check if a repository has already been cloned with usable content.
 */
export async function isRepoCloned(slug: string): Promise<boolean> {
  if (resolvedRepoRoots.has(slug)) {
    return true;
  }

  try {
    const repoPath = join(REPOS_DIR, slug);
    const gitPath = join(repoPath, '.git');
    const gitInfo = await stat(gitPath);
    if (!gitInfo.isDirectory()) {
      return false;
    }

    const entries = await readdir(repoPath);
    return entries.some((entry) => entry !== '.git');
  } catch {
    return false;
  }
}

/**
 * Clean up cloned repositories (not monorepo siblings).
 */
export async function cleanRepos(): Promise<void> {
  console.log('🧹 Cleaning up cloned repositories...');

  const proc = Bun.spawn(['rm', '-rf', REPOS_DIR], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  await proc.exited;
  resolvedRepoRoots.clear();
  console.log('✅ Repositories cleaned');
}
