/**
 * Regenerate programmatic Excalidraw scenes and aggregate hand-drawn scenes from repos.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';
import { isDocumentationHubProject } from './manifest.ts';
import { getRepoPath } from './clone-repos.ts';
import { aggregateExcalidrawDiagrams } from './aggregate-excalidraw.ts';

const GENERATOR_PATTERN = /^generate-.*-excalidraw\.ts$/i;

async function runGenerator(scriptPath: string, cwd: string, label: string): Promise<void> {
  console.log(`  Running ${label}...`);
  const proc = Bun.spawn(['bun', 'run', scriptPath], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Excalidraw generator failed: ${label}`);
  }
}

async function runHubGenerators(): Promise<void> {
  console.log('  Hub generators:');
  await runGenerator('scripts/generate-tech-stack-excalidraw.ts', '.', 'tech-stack');
}

async function findGeneratorScripts(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && GENERATOR_PATTERN.test(e.name))
      .map((e) => join(dir, e.name));
  } catch {
    return [];
  }
}

async function runProjectGenerators(projects: Project[]): Promise<void> {
  const external = projects.filter((p) => !isDocumentationHubProject(p));
  if (external.length === 0) {
    return;
  }

  console.log('  Project generators:');
  for (const project of external) {
    const repoPath = getRepoPath(project.slug);
    const scriptsDir = join(repoPath, 'scripts');
    const generators = await findGeneratorScripts(scriptsDir);

    for (const generator of generators) {
      const name = generator.split('/').pop() ?? generator;
      if (name === 'generate-tech-stack-excalidraw.ts') {
        continue;
      }
      await runGenerator(join('scripts', name), repoPath, `${project.slug}/${name}`);
    }
  }
}

export async function regenerateExcalidraw(projects: Project[]): Promise<void> {
  console.log('\n🔄 Regenerating Excalidraw diagrams...\n');
  await runHubGenerators();
  await runProjectGenerators(projects);
  await aggregateExcalidrawDiagrams(projects);
}
