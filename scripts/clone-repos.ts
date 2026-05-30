/**
 * Repository cloning utilities
 * Handles parallel cloning of project repositories
 */

import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';
import { isDocumentationHubProject } from './manifest.ts';

const REPOS_DIR = '.repos';

/**
 * Clone all project repositories in parallel
 */
export async function cloneAllRepos(projects: Project[]): Promise<void> {
  const reposToClone = projects.filter((project) => {
    if (isDocumentationHubProject(project)) {
      console.warn(
        `  ⚠️  Skipping clone for ${project.slug}: documentation hub cannot pull itself`
      );
      return false;
    }
    return true;
  });

  console.log(`\n📦 Cloning ${reposToClone.length} repositories...\n`);

  await mkdir(REPOS_DIR, { recursive: true });

  const clonePromises = reposToClone.map((project) =>
    ensureRepoCloned(project.repo, project.slug, project.name).catch((error) => {
      console.error(`❌ Failed to clone ${project.slug}:`, error.message);
      throw error;
    })
  );

  await Promise.all(clonePromises);
  console.log('\n✅ All repositories cloned successfully\n');
}

/**
 * Clone a repository if it is not already present under .repos/<slug>.
 */
export async function ensureRepoCloned(
  repoUrl: string,
  slug: string,
  displayName = slug
): Promise<void> {
  if (await isRepoCloned(slug)) {
    console.log(`  ✓ ${displayName} (${slug}) already cloned`);
    return;
  }

  const repoPath = join(REPOS_DIR, slug);

  // Remove broken clones that only contain .git metadata.
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
 * Get the path to a cloned repository
 */
export function getRepoPath(slug: string): string {
  return join(REPOS_DIR, slug);
}

/**
 * Check if a repository has already been cloned with usable content.
 */
export async function isRepoCloned(slug: string): Promise<boolean> {
  try {
    const repoPath = getRepoPath(slug);
    const gitPath = join(repoPath, '.git');
    const gitInfo = await stat(gitPath);
    if (!gitInfo.isDirectory()) {
      return false;
    }

    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(repoPath);
    // A valid clone has tracked files beyond .git (empty/failed clones do not).
    return entries.some((entry) => entry !== '.git');
  } catch {
    return false;
  }
}

/**
 * Clean up cloned repositories
 */
export async function cleanRepos(): Promise<void> {
  console.log('🧹 Cleaning up cloned repositories...');
  
  const proc = Bun.spawn(['rm', '-rf', REPOS_DIR], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  
  await proc.exited;
  console.log('✅ Repositories cleaned');
}
