/**
 * Main build orchestrator
 * Coordinates all build steps for the documentation hub
 */

import { parseManifest, externalProjects, isDocumentationHubProject } from './manifest.ts';
import { cloneGovernance, discoverProjectsFromGovernance, mergeProjects } from './governance.ts';
import { cloneAllRepos, cleanRepos } from './clone-repos.ts';
import { aggregateStarlightDocs, cleanDocs } from './aggregate-docs.ts';
import { processOpenApiProjects, cleanOpenApiSpecs } from './scalar-integration.ts';
import { buildRustDocs, cleanRustDocs } from './rustdoc.ts';
import { generateNavigation } from './generate-nav.ts';

const MANIFEST_PATH = 'projects.toml';

/**
 * Main build function
 */
async function build() {
  console.log('🚀 ScottyLabs Documentation Hub Build\n');
  console.log('   Single source of truth for all documentation\n');
  
  const startTime = Date.now();
  
  try {
    // Parse manual manifest
    console.log('📋 Reading manual project manifest...');
    const manifestProjects = await parseManifest(MANIFEST_PATH);
    console.log(`   Found ${manifestProjects.length} manually configured projects\n`);
    
    // Discover projects from governance
    let governanceProjects = [];
    try {
      await cloneGovernance();
      governanceProjects = await discoverProjectsFromGovernance();
    } catch (error) {
      console.warn('⚠️  Could not fetch governance data, using manual projects only');
    }
    
    // Merge projects (manual overrides governance)
    const allProjects = mergeProjects(governanceProjects, manifestProjects);
    const hubProjects = allProjects.filter(isDocumentationHubProject);
    const remoteProjects = externalProjects(allProjects);

    if (hubProjects.length > 0) {
      console.log(
        `   Including ${hubProjects.length} hub doc source(s) from local docs/ (no self-clone)\n`
      );
    }

    console.log(`📦 Total projects to build: ${allProjects.length}\n`);

    if (allProjects.length === 0) {
      console.log('ℹ️  No projects found');
      console.log('   - Add projects to projects.toml, OR');
      console.log('   - Add `docs: true` flag to projects in governance\n');
      return;
    }

    // Clone external repositories only
    await cloneAllRepos(allProjects);

    // Aggregate Starlight documentation (hub uses ./docs, not src/content/docs)
    await aggregateStarlightDocs(allProjects);

    // Process OpenAPI projects
    await processOpenApiProjects(remoteProjects);

    // Build Rust documentation
    await buildRustDocs(remoteProjects);

    // Generate navigation
    await generateNavigation(allProjects);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Build completed in ${duration}s\n`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Clean build artifacts
 */
async function clean() {
  console.log('🧹 Cleaning build artifacts...\n');
  
  await cleanRepos();
  await cleanDocs();
  await cleanOpenApiSpecs();
  await cleanRustDocs();
  
  console.log('\n✅ Clean completed\n');
}

// Run build or clean based on argument
const command = process.argv[2];

if (command === 'clean') {
  await clean();
} else {
  await build();
}
