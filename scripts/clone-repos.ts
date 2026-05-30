/**
 * Repository cloning utilities
 * Handles parallel cloning of project repositories
 */

import { mkdir } from 'node:fs/promises';
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
  
  // Ensure .repos directory exists
  await mkdir(REPOS_DIR, { recursive: true });
  
  // Clone repos in parallel
  const clonePromises = reposToClone.map(project =>
    cloneRepo(project).catch(error => {
      console.error(`❌ Failed to clone ${project.slug}:`, error.message);
      throw error;
    })
  );
  
  await Promise.all(clonePromises);
  console.log('\n✅ All repositories cloned successfully\n');
}

/**
 * Clone a single repository
 */
async function cloneRepo(project: Project): Promise<void> {
  if (isDocumentationHubProject(project)) {
    throw new Error(`Refusing to clone documentation hub repo (${project.slug})`);
  }

  const repoPath = join(REPOS_DIR, project.slug);
  
  console.log(`  Cloning ${project.name} (${project.slug})...`);
  
  const proc = Bun.spawn(
    ['git', 'clone', '--depth', '1', '--single-branch', project.repo, repoPath],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Git clone failed for ${project.slug}: ${stderr}`);
  }
  
  console.log(`  ✓ ${project.name} cloned`);
}

/**
 * Get the path to a cloned repository
 */
export function getRepoPath(slug: string): string {
  return join(REPOS_DIR, slug);
}

/**
 * Check if a repository has already been cloned
 */
export async function isRepoCloned(slug: string): Promise<boolean> {
  const repoPath = getRepoPath(slug);
  const dir = Bun.file(join(repoPath, '.git'));
  return await dir.exists();
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
