/**
 * Main build orchestrator
 * Coordinates all build steps for the documentation hub
 */

import { parseManifest, isDocumentationHubProject, type Project } from './manifest.ts';
import { cloneGovernance, discoverProjectsFromGovernance, mergeProjects } from './governance.ts';
import { resolveAllRepoRoots, cleanRepos } from './clone-repos.ts';
import { aggregateStarlightDocs, cleanDocs } from './aggregate-docs.ts';
import { generateNavigation } from './generate-nav.ts';

const MANIFEST_PATH = 'projects.toml';

async function build() {
  console.log('🚀 ScottyLabs Documentation Hub Build\n');
  const startTime = Date.now();

  try {
    console.log('📋 Reading manual project manifest...');
    const manifestProjects = await parseManifest(MANIFEST_PATH);
    console.log(`   Found ${manifestProjects.length} manually configured projects\n`);

    let governanceProjects: Project[] = [];
    try {
      await cloneGovernance();
    } catch {
      console.warn('⚠️  Could not clone governance, trying local/monorepo paths');
    }
    try {
      governanceProjects = await discoverProjectsFromGovernance();
    } catch {
      console.warn('⚠️  Could not read governance data, using manual projects only');
    }

    const allProjects = mergeProjects(governanceProjects, manifestProjects);
    const hubProjects = allProjects.filter(isDocumentationHubProject);

    if (hubProjects.length > 0) {
      console.log(`   Including ${hubProjects.length} hub doc source(s) from local docs/\n`);
    }
    console.log(`📦 Total projects: ${allProjects.length}\n`);

    if (allProjects.length === 0) {
      console.warn('⚠️  No projects discovered; only Welcome pages will appear');
    } else {
      await resolveAllRepoRoots(allProjects);
      await aggregateStarlightDocs(allProjects);
    }

    // Write repos.json: slug → repo URL, consumed by sidebar-logo.js at runtime
    const repoMap: Record<string, string> = {};
    for (const p of allProjects) {
      if (p.repo) repoMap[p.slug] = p.repo;
    }
    await Bun.write('src/content/docs/repos.json', JSON.stringify(repoMap));

    // Generate src/content/docs/SUMMARY.md from aggregated content
    await generateNavigation(allProjects);

    // Run mdbook — expects mdbook (and mdbook-mermaid) in PATH
    console.log('📖 Running mdbook build...');
    const proc = Bun.spawn(['mdbook', 'build'], { stdout: 'inherit', stderr: 'inherit' });
    const code = await proc.exited;
    if (code !== 0) throw new Error(`mdbook build exited with code ${code}`);


    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Build completed in ${duration}s\n`);

  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

async function clean() {
  console.log('🧹 Cleaning build artifacts...\n');
  await cleanRepos();
  await cleanDocs();
  console.log('\n✅ Clean completed\n');
}

const command = process.argv[2];
if (command === 'clean') {
  await clean();
} else {
  await build();
}
