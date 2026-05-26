/**
 * Governance integration utilities
 * Discovers projects with `docs: true` flag from governance repository
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parse as parseToml } from 'smol-toml';
import type { Project } from './manifest.ts';

const GOVERNANCE_REPO = 'https://codeberg.org/ScottyLabs/governance.git';
const GOVERNANCE_DIR = '.repos/governance';
const SCOTTYLABS_ORG = 'https://codeberg.org/scottylabs';

interface GovernanceRepo {
  name: string;
  description?: string;
  kennel?: boolean;
  sentry?: boolean;
  docs?: boolean;
  docs_type?: 'starlight' | 'rust' | 'openapi';
  docs_dir?: string;
  openapi_spec?: string;
  export_command?: string;
}

interface GovernanceProject {
  name: string;
  slug: string;
  repos?: GovernanceRepo[];
  channels?: any[];
}

interface GovernanceTeam {
  team: {
    name: string;
    slug: string;
    leads?: string[];
    projects?: GovernanceProject[];
    channels?: any[];
  };
}

/**
 * Clone governance repository
 */
export async function cloneGovernance(): Promise<void> {
  console.log('📋 Fetching governance data...');
  
  const proc = Bun.spawn(
    ['git', 'clone', '--depth', '1', '--single-branch', GOVERNANCE_REPO, GOVERNANCE_DIR],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to clone governance repo: ${stderr}`);
  }
  
  console.log('  ✓ Governance data fetched\n');
}

/**
 * Discover projects with docs flag from governance
 */
export async function discoverProjectsFromGovernance(): Promise<Project[]> {
  console.log('🔍 Discovering projects from governance...');
  
  // Look in the data/ directory for team definitions
  const dataDir = join(GOVERNANCE_DIR, 'data');
  const projects: Project[] = [];
  
  try {
    const files = await readdir(dataDir);
    
    for (const file of files) {
      if (!file.endsWith('.toml')) {
        continue;
      }
      
      const filePath = join(dataDir, file);
      const content = await readFile(filePath, 'utf-8');
      
      try {
        const teamData = parseToml(content) as GovernanceTeam;
        
        if (!teamData.team?.projects) {
          continue;
        }
        
        // Iterate through projects in this team
        for (const govProject of teamData.team.projects) {
          if (!govProject.repos) {
            continue;
          }
          
          // Iterate through repos in this project
          for (const repo of govProject.repos) {
            if (repo.docs) {
              const project = convertRepoToProject(repo, govProject);
              projects.push(project);
              console.log(`  ✓ Found: ${project.name} (${govProject.name})`);
            }
          }
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not parse ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.warn('  ⚠️  Could not read governance data directory');
    console.warn('  Continuing with manually configured projects only');
    return [];
  }
  
  console.log(`  Found ${projects.length} projects with docs flag\n`);
  return projects;
}

/**
 * Convert governance repo to documentation project
 */
function convertRepoToProject(repo: GovernanceRepo, govProject: GovernanceProject): Project {
  // Use repo name as slug (it should already be kebab-case)
  const slug = repo.name;
  
  // Construct repository URL
  const repoUrl = `${SCOTTYLABS_ORG}/${repo.name}`;
  
  return {
    slug,
    name: govProject.name,
    repo: repoUrl,
    type: repo.docs_type || 'starlight',
    docs_dir: repo.docs_dir || 'docs',
    description: repo.description || `${govProject.name} documentation`,
    openapi_spec: repo.openapi_spec,
    export_command: repo.export_command,
  };
}

/**
 * Merge governance projects with manual projects from manifest
 */
export function mergeProjects(governanceProjects: Project[], manifestProjects: Project[]): Project[] {
  const merged = new Map<string, Project>();
  
  // Add all governance projects
  for (const project of governanceProjects) {
    merged.set(project.slug, project);
  }
  
  // Add/override with manual projects
  for (const project of manifestProjects) {
    merged.set(project.slug, project);
  }
  
  return Array.from(merged.values());
}
