/**
 * Project manifest types and parser
 * Defines the structure of projects.toml and provides parsing utilities
 */

export type ProjectType = 'starlight' | 'rust' | 'openapi';

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
  
  // Validate each project
  for (const project of manifest.project) {
    validateProject(project);
  }
  
  return manifest.project;
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
