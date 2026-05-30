import { join } from 'node:path';

export type ProjectType = 'starlight' | 'rust' | 'openapi';

/** Slug/repo name of this repository — must never be cloned during build. */
export const DOCUMENTATION_HUB_SLUG = 'documentation';

export interface Project {
  slug: string;
  name: string;
  repo: string;
  type: ProjectType;
  docs_dir: string;
  description: string;
  openapi_spec?: string;
  export_command?: string;
}

export interface ProjectManifest {
  project: Project[];
}

/**
 * Parse projects.toml manifest file
 */
export async function parseManifest(path: string): Promise<Project[]> {
  const file = Bun.file(path);
  const text = await file.text();
  
  // Use Bun's built-in TOML parser
  const manifest = await import('smol-toml').then(mod => mod.parse(text)) as ProjectManifest;
  
  if (!manifest.project) {
    return [];
  }
  
  return manifest.project.filter((project) => {
    validateProject(project);
    return true;
  });
}

/**
 * Returns true when a project refers to this documentation hub repo.
 */
export function isDocumentationHubProject(project: Pick<Project, 'slug' | 'repo'>): boolean {
  const slug = project.slug.toLowerCase();
  if (slug === DOCUMENTATION_HUB_SLUG) {
    return true;
  }

  const repo = project.repo.toLowerCase().replace(/\.git$/, '');
  return (
    repo.endsWith('/documentation') ||
    repo.endsWith('/scottylabs/documentation')
  );
}

/**
 * Filesystem root for a project during build.
 * The hub repo is already checked out — read its docs/ in place, never clone it.
 */
export function resolveProjectRepoRoot(project: Pick<Project, 'slug' | 'repo'>): string {
  if (isDocumentationHubProject(project)) {
    return '.';
  }
  return join('.repos', project.slug);
}

/**
 * Projects that live in external repositories (excludes this hub).
 */
export function externalProjects(projects: Project[]): Project[] {
  return projects.filter((project) => !isDocumentationHubProject(project));
}

/**
 * Validate project configuration
 */
function validateProject(project: Project): void {
  const required = ['slug', 'name', 'repo', 'type', 'docs_dir', 'description'];
  
  for (const field of required) {
    if (!project[field as keyof Project]) {
      throw new Error(`Project missing required field: ${field}`);
    }
  }
  
  const validTypes: ProjectType[] = ['starlight', 'rust', 'openapi'];
  if (!validTypes.includes(project.type)) {
    throw new Error(`Invalid project type: ${project.type}. Must be one of: ${validTypes.join(', ')}`);
  }
  
  // Validate slug format (lowercase, alphanumeric, hyphens)
  if (!/^[a-z0-9-]+$/.test(project.slug)) {
    throw new Error(`Invalid slug format: ${project.slug}. Must be lowercase alphanumeric with hyphens.`);
  }
  
  // OpenAPI projects require additional fields
  if (project.type === 'openapi') {
    if (!project.openapi_spec) {
      throw new Error(`OpenAPI project ${project.slug} missing openapi_spec field`);
    }
  }
}

/**
 * Get project by slug
 */
export function getProject(projects: Project[], slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}

/**
 * Group projects by type
 */
export function groupProjectsByType(projects: Project[]): Record<ProjectType, Project[]> {
  return projects.reduce((acc, project) => {
    if (!acc[project.type]) {
      acc[project.type] = [];
    }
    acc[project.type].push(project);
    return acc;
  }, {} as Record<ProjectType, Project[]>);
}
