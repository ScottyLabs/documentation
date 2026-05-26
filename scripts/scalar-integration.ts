/**
 * OpenAPI/Scalar integration utilities
 * Handles extracting OpenAPI specs and generating Scalar pages
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';
import { getRepoPath } from './clone-repos.ts';

const SPECS_DIR = 'src/specs';
const PUBLIC_SPECS_DIR = 'public/specs';

/**
 * Process all OpenAPI projects
 */
export async function processOpenApiProjects(projects: Project[]): Promise<void> {
  console.log(`\n🔌 Processing OpenAPI projects...\n`);
  
  const openApiProjects = projects.filter(p => p.type === 'openapi');
  
  if (openApiProjects.length === 0) {
    console.log('  No OpenAPI projects found\n');
    return;
  }
  
  // Ensure specs directories exist
  await mkdir(SPECS_DIR, { recursive: true });
  await mkdir(PUBLIC_SPECS_DIR, { recursive: true });
  
  for (const project of openApiProjects) {
    await processOpenApiProject(project);
  }
  
  console.log('✅ OpenAPI specs processed\n');
}

/**
 * Process a single OpenAPI project
 */
async function processOpenApiProject(project: Project): Promise<void> {
  console.log(`  Processing ${project.name}...`);
  
  const repoPath = getRepoPath(project.slug);
  
  // If export_command is provided, run it to generate the spec
  if (project.export_command) {
    await runExportCommand(project, repoPath);
  }
  
  // Copy the OpenAPI spec to both locations
  const sourceSpec = join(repoPath, project.openapi_spec!);
  const targetSpec = join(SPECS_DIR, `${project.slug}.json`);
  const publicSpec = join(PUBLIC_SPECS_DIR, `${project.slug}.json`);
  
  try {
    const specContent = await Bun.file(sourceSpec).text();
    
    // Validate it's valid JSON
    JSON.parse(specContent);
    
    // Write to both locations
    await writeFile(targetSpec, specContent);
    await writeFile(publicSpec, specContent);
    
    console.log(`  ✓ ${project.name} OpenAPI spec copied`);
  } catch (error) {
    console.error(`  ❌ Failed to process OpenAPI spec for ${project.slug}:`, error);
    throw error;
  }
}

/**
 * Run the export command to generate OpenAPI spec
 */
async function runExportCommand(project: Project, repoPath: string): Promise<void> {
  console.log(`    Running export command: ${project.export_command}`);
  
  const commands = project.export_command!.split(' ');
  
  const proc = Bun.spawn(commands, {
    cwd: repoPath,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Export command failed for ${project.slug}: ${stderr}`);
  }
  
  console.log(`    ✓ Export command completed`);
}

/**
 * Clean up OpenAPI specs
 */
export async function cleanOpenApiSpecs(): Promise<void> {
  console.log('🧹 Cleaning up OpenAPI specs...');
  
  const proc = Bun.spawn(['rm', '-rf', SPECS_DIR, PUBLIC_SPECS_DIR], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  
  await proc.exited;
  console.log('✅ OpenAPI specs cleaned');
}
