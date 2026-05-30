/**
 * Governance integration utilities
 * Discovers repositories from governance (docs hub inclusion is on by default; opt out with docs = false)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { Project } from './manifest.ts';
import { ensureRepoCloned } from './clone-repos.ts';

const GOVERNANCE_REPO = 'https://codeberg.org/ScottyLabs/governance.git';
const GOVERNANCE_SLUG = 'governance';
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
    repos?: GovernanceRepo[];
    projects?: GovernanceProject[];
    channels?: any[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGovernanceRepo(value: unknown): value is GovernanceRepo {
  return isRecord(value) && typeof value.name === 'string';
}

function isGovernanceProject(value: unknown): value is GovernanceProject {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.slug !== 'string') {
    return false;
  }
  if (value.repos !== undefined) {
    if (!Array.isArray(value.repos) || !value.repos.every(isGovernanceRepo)) {
      return false;
    }
  }
  return true;
}

function isGovernanceTeam(value: unknown): value is GovernanceTeam {
  if (!isRecord(value) || !isRecord(value.team)) {
    return false;
  }
  const { team } = value;
  if (typeof team.name !== 'string' || typeof team.slug !== 'string') {
    return false;
  }
  if (team.repos !== undefined) {
    if (!Array.isArray(team.repos) || !team.repos.every(isGovernanceRepo)) {
      return false;
    }
  }
  if (team.projects !== undefined) {
    if (!Array.isArray(team.projects) || !team.projects.every(isGovernanceProject)) {
      return false;
    }
  }
  return true;
}

function parseGovernanceTeamFile(content: string): GovernanceTeam | null {
  const parsed = parseToml(content);
  return isGovernanceTeam(parsed) ? parsed : null;
}

function repoIncludesDocs(repo: GovernanceRepo): boolean {
  return repo.docs !== false;
}

function repoDisplayName(repo: GovernanceRepo): string {
  return repo.name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Clone governance repository
 */
export async function cloneGovernance(): Promise<void> {
  console.log('📋 Fetching governance data...');
  await ensureRepoCloned(GOVERNANCE_REPO, GOVERNANCE_SLUG, 'governance');
  console.log('  ✓ Governance data fetched\n');
}

function collectDocsReposFromTeam(teamData: GovernanceTeam): Project[] {
  const projects: Project[] = [];
  const { team } = teamData;

  for (const repo of team.repos ?? []) {
    if (repoIncludesDocs(repo)) {
      projects.push(convertTeamRepoToProject(repo, team.name));
    }
  }

  for (const govProject of team.projects ?? []) {
    for (const repo of govProject.repos ?? []) {
      if (repoIncludesDocs(repo)) {
        projects.push(convertRepoToProject(repo, govProject));
      }
    }
  }

  return projects;
}

/**
 * Discover projects with docs flag from governance
 */
export async function discoverProjectsFromGovernance(): Promise<Project[]> {
  console.log('🔍 Discovering projects from governance...');

  const teamsDir = join('.repos', GOVERNANCE_SLUG, 'data', 'teams');
  const projects: Project[] = [];

  try {
    const files = await readdir(teamsDir);

    for (const file of files) {
      if (!file.endsWith('.toml')) {
        continue;
      }

      const filePath = join(teamsDir, file);
      const content = await readFile(filePath, 'utf-8');

      try {
        const teamData = parseGovernanceTeamFile(content);
        if (!teamData) {
          continue;
        }

        for (const project of collectDocsReposFromTeam(teamData)) {
          projects.push(project);
          console.log(`  ✓ Found: ${project.name} (${teamData.team.name})`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not parse ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.warn('  ⚠️  Could not read governance teams directory');
    console.warn('  Continuing with manually configured projects only');
    return [];
  }

  console.log(`  Found ${projects.length} repositories for documentation\n`);
  return projects;
}

/**
 * Convert a team-level governance repo to a documentation project
 */
function convertTeamRepoToProject(repo: GovernanceRepo, teamName: string): Project {
  const slug = repo.name;
  const repoUrl = `${SCOTTYLABS_ORG}/${repo.name}`;

  return {
    slug,
    name: repoDisplayName(repo),
    repo: repoUrl,
    type: repo.docs_type || 'starlight',
    docs_dir: repo.docs_dir || 'docs',
    description: repo.description || `${teamName} documentation`,
    openapi_spec: repo.openapi_spec,
    export_command: repo.export_command,
  };
}

/**
 * Convert governance project repo to documentation project
 */
function convertRepoToProject(repo: GovernanceRepo, govProject: GovernanceProject): Project {
  const slug = repo.name;
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

  for (const project of governanceProjects) {
    merged.set(project.slug, project);
  }

  for (const project of manifestProjects) {
    merged.set(project.slug, project);
  }

  return Array.from(merged.values());
}
