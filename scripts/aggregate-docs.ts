/**
 * Documentation aggregation utilities
 * Handles copying and merging markdown content from projects
 */

import { mkdir, cp, readdir, stat } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import type { Project } from './manifest.ts';
import { resolveProjectRepoRoot } from './manifest.ts';

const CONTENT_DIR = 'src/content/docs';

/**
 * Aggregate documentation from all Starlight projects
 */
export async function aggregateStarlightDocs(projects: Project[]): Promise<void> {
  console.log(`\n📚 Aggregating Starlight documentation...\n`);
  
  const starlightProjects = projects.filter(p => p.type === 'starlight');
  
  for (const project of starlightProjects) {
    await aggregateProjectDocs(project);
  }
  
  console.log('✅ Documentation aggregated\n');
}

/**
 * Aggregate documentation from a single project
 */
async function aggregateProjectDocs(project: Project): Promise<void> {
  console.log(`  Processing ${project.name}...`);
  
  const repoPath = resolveProjectRepoRoot(project);
  const sourceDocs = join(repoPath, project.docs_dir);
  const targetDocs = join(CONTENT_DIR, project.slug);
  
  // Check if docs directory exists
  try {
    await stat(sourceDocs);
  } catch {
    console.warn(`  ⚠️  No docs directory found at ${sourceDocs}`);
    return;
  }
  
  // Create target directory
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
    const targetPath = join(target, entry.name);
    const entryRelativePath = join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyMarkdownFiles(sourcePath, targetPath, project, entryRelativePath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      await processMarkdownFile(sourcePath, targetPath, project);
    }
  }
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
  
  // Parse frontmatter if it exists
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  
  let processedContent: string;
  
  if (frontmatterMatch) {
    // Add project metadata to existing frontmatter
    const existingFrontmatter = frontmatterMatch[1];
    const restContent = content.slice(frontmatterMatch[0].length);
    
    processedContent = `---
${existingFrontmatter}
project: "${project.slug}"
projectType: "${project.type}"
---
${restContent}`;
  } else {
    // Add new frontmatter with project metadata
    processedContent = `---
project: "${project.slug}"
projectType: "${project.type}"
---

${content}`;
  }
  
  await Bun.write(targetPath, processedContent);
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
