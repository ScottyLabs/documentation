/**
 * Rustdoc integration utilities
 * Handles building rustdoc and copying output to public directory
 */

import { mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';
import { getRepoPath } from './clone-repos.ts';

const PUBLIC_DIR = 'public';

/**
 * Build rustdoc for all Rust projects
 */
export async function buildRustDocs(projects: Project[]): Promise<void> {
  console.log(`\n🦀 Building Rust documentation...\n`);
  
  const rustProjects = projects.filter(p => p.type === 'rust');
  
  if (rustProjects.length === 0) {
    console.log('  No Rust projects found\n');
    return;
  }
  
  for (const project of rustProjects) {
    await buildProjectRustDoc(project);
  }
  
  console.log('✅ Rust documentation built\n');
}

/**
 * Build rustdoc for a single project
 */
async function buildProjectRustDoc(project: Project): Promise<void> {
  console.log(`  Building ${project.name}...`);
  
  const repoPath = getRepoPath(project.slug);
  
  // Build rustdoc
  console.log(`    Running cargo doc...`);
  const proc = Bun.spawn(
    ['cargo', 'doc', '--no-deps', '--target-dir', 'target'],
    {
      cwd: repoPath,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`cargo doc failed for ${project.slug}: ${stderr}`);
  }
  
  console.log(`    ✓ cargo doc completed`);
  
  // Copy rustdoc output to public directory
  const sourceDoc = join(repoPath, 'target', 'doc');
  const targetDoc = join(PUBLIC_DIR, project.slug, 'api');
  
  console.log(`    Copying docs to ${targetDoc}...`);
  
  await mkdir(join(PUBLIC_DIR, project.slug), { recursive: true });
  
  try {
    await cp(sourceDoc, targetDoc, { recursive: true });
    console.log(`  ✓ ${project.name} rustdoc copied to /${project.slug}/api/`);
  } catch (error) {
    console.error(`  ❌ Failed to copy rustdoc for ${project.slug}:`, error);
    throw error;
  }
}

/**
 * Clean up rustdoc builds
 */
export async function cleanRustDocs(): Promise<void> {
  console.log('🧹 Cleaning up Rust documentation...');
  
  // Clean up public/*/api directories
  const proc = Bun.spawn(['find', PUBLIC_DIR, '-type', 'd', '-name', 'api', '-exec', 'rm', '-rf', '{}', '+'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  
  await proc.exited;
  console.log('✅ Rust documentation cleaned');
}
