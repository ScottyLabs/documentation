/**
 * Main build orchestrator
 * Coordinates all build steps for the documentation hub
 */

import { parseManifest } from './manifest.ts';
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
    const projects = mergeProjects(governanceProjects, manifestProjects);
    console.log(`📦 Total projects to build: ${projects.length}\n`);
    
    if (projects.length === 0) {
      console.log('ℹ️  No projects found');
      console.log('   - Add projects to projects.toml, OR');
      console.log('   - Add `docs: true` flag to projects in governance\n');
      return;
    }
    
    // Clone repositories
    await cloneAllRepos(projects);
    
    // Aggregate Starlight documentation
    await aggregateStarlightDocs(projects);
    
    // Process OpenAPI projects
    await processOpenApiProjects(projects);
    
    // Build Rust documentation
    await buildRustDocs(projects);
    
    // Generate navigation
    await generateNavigation(projects);
    
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
