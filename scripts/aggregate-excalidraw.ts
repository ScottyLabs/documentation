/**
 * Copy Excalidraw scene files from project repos into public/diagrams/{slug}/.
 */

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Project } from './manifest.ts';
import {
  isDocumentationHubProject,
  resolveProjectDocsDir,
} from './manifest.ts';
import { getRepoPath } from './clone-repos.ts';
import { normalizeEntryName } from './redirects.ts';

const PUBLIC_DIAGRAMS = 'public/diagrams';
const DIAGRAMS_DIR_NAME = 'diagrams';
const EXCALIDRAW_SUFFIX = '.excalidraw.json';

export function publicDiagramUrl(projectSlug: string, fileName: string): string {
  const base = fileName.replace(/\.excalidraw\.json$/i, '');
  return `/diagrams/${projectSlug}/${base}.excalidraw.json`;
}

async function isExcalidrawScene(path: string): Promise<boolean> {
  try {
    const raw = await Bun.file(path).text();
    const parsed = JSON.parse(raw) as { type?: string };
    return parsed.type === 'excalidraw';
  } catch {
    return false;
  }
}

async function copyScene(sourcePath: string, targetPath: string): Promise<void> {
  await mkdir(join(targetPath, '..'), { recursive: true });
  await cp(sourcePath, targetPath);
}

async function walkDiagramDir(
  sourceDir: string,
  targetDir: string,
  relativePrefix = '',
): Promise<number> {
  let count = 0;
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      count += await walkDiagramDir(
        sourcePath,
        targetDir,
        join(relativePrefix, entry.name),
      );
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(EXCALIDRAW_SUFFIX)) {
      continue;
    }

    const normalizedName = normalizeEntryName(entry.name);
    const relDir = relativePrefix ? join(relativePrefix, normalizedName) : normalizedName;
    const targetPath = join(targetDir, relDir);

    if (!(await isExcalidrawScene(sourcePath))) {
      console.warn(`  ⚠️  Skipping invalid Excalidraw scene: ${sourcePath}`);
      continue;
    }

    await copyScene(sourcePath, targetPath);
    count += 1;
  }

  return count;
}

async function aggregateHubDiagrams(project: Project): Promise<number> {
  const docsDir = resolveProjectDocsDir(project);
  const sourceDiagrams = join('.', docsDir, DIAGRAMS_DIR_NAME);
  const targetDir = join(PUBLIC_DIAGRAMS, project.slug);

  try {
    await stat(sourceDiagrams);
  } catch {
    return 0;
  }

  return await walkDiagramDir(sourceDiagrams, targetDir);
}

async function aggregateProjectDiagrams(project: Project): Promise<number> {
  const repoPath = getRepoPath(project.slug);
  const docsDir = resolveProjectDocsDir(project);
  const sourceDiagrams = join(repoPath, docsDir, DIAGRAMS_DIR_NAME);
  const targetDir = join(PUBLIC_DIAGRAMS, project.slug);

  try {
    await stat(sourceDiagrams);
  } catch {
    return 0;
  }

  return await walkDiagramDir(sourceDiagrams, targetDir);
}

/**
 * Remove aggregated diagram trees (keeps hub-generated flat files until regenerated).
 */
export async function cleanAggregatedDiagrams(): Promise<void> {
  try {
    await stat(PUBLIC_DIAGRAMS);
  } catch {
    await mkdir(PUBLIC_DIAGRAMS, { recursive: true });
    return;
  }

  const entries = await readdir(PUBLIC_DIAGRAMS, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(PUBLIC_DIAGRAMS, entry.name);
    if (entry.isDirectory()) {
      await rm(path, { recursive: true, force: true });
    }
  }
}

export async function aggregateExcalidrawDiagrams(projects: Project[]): Promise<void> {
  console.log('\n🖊️  Aggregating Excalidraw diagrams...\n');

  await cleanAggregatedDiagrams();

  const starlightProjects = projects.filter((p) => p.type === 'starlight');
  let total = 0;

  for (const project of starlightProjects) {
    const count = isDocumentationHubProject(project)
      ? await aggregateHubDiagrams(project)
      : await aggregateProjectDiagrams(project);

    if (count > 0) {
      console.log(`  ✓ ${project.name}: ${count} diagram(s) → public/diagrams/${project.slug}/`);
      total += count;
    }
  }

  if (total === 0) {
    console.log('  No Excalidraw diagrams found in project docs/diagrams/\n');
  } else {
    console.log(`✅ Aggregated ${total} Excalidraw diagram(s)\n`);
  }
}
