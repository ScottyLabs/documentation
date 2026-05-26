/**
 * Navigation generation utilities
 * Dynamically generates Starlight sidebar from project manifest
 */

import { writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Project } from './manifest.ts';

const CONTENT_DIR = 'src/content/docs';

interface SidebarItem {
  label: string;
  link?: string;
  items?: SidebarItem[];
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
  collapsed?: boolean;
}

/**
 * Generate dynamic sidebar configuration
 */
export async function generateNavigation(projects: Project[]): Promise<void> {
  console.log(`\n🧭 Generating navigation...\n`);
  
  const sidebar: (SidebarGroup | SidebarItem)[] = [
    {
      label: 'Welcome',
      items: [
        { label: 'Home', link: '/' },
        { label: 'Getting Started', link: '/getting-started/' },
      ],
    },
  ];
  
  // Add project sections
  for (const project of projects) {
    const projectSection = await generateProjectSection(project);
    if (projectSection) {
      sidebar.push(projectSection);
    }
  }
  
  // Write updated astro.config.mjs
  await writeAstroConfig(sidebar);
  
  console.log('✅ Navigation generated\n');
}

/**
 * Generate sidebar section for a single project
 */
async function generateProjectSection(project: Project): Promise<SidebarGroup | null> {
  const projectDocsPath = join(CONTENT_DIR, project.slug);
  
  let items: SidebarItem[] = [];
  
  // For Starlight projects, scan the docs directory
  if (project.type === 'starlight') {
    try {
      items = await generateStarlightItems(project);
    } catch (error) {
      console.warn(`  ⚠️  Could not generate nav items for ${project.slug}`);
      return null;
    }
  }
  
  // Add API reference link for OpenAPI projects
  if (project.type === 'openapi') {
    items.push({
      label: 'API Reference',
      link: `/${project.slug}/api/`,
    });
  }
  
  // Add rustdoc link for Rust projects
  if (project.type === 'rust') {
    items.push({
      label: 'API Documentation',
      link: `/${project.slug}/api/`,
    });
  }
  
  if (items.length === 0) {
    return null;
  }
  
  return {
    label: project.name,
    items,
    collapsed: true,
  };
}

/**
 * Generate nav items from Starlight markdown files
 */
async function generateStarlightItems(project: Project): Promise<SidebarItem[]> {
  const projectDocsPath = join(CONTENT_DIR, project.slug);
  const items: SidebarItem[] = [];
  
  try {
    const entries = await readdir(projectDocsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        const name = basename(entry.name, entry.name.endsWith('.mdx') ? '.mdx' : '.md');
        const label = formatLabel(name);
        
        items.push({
          label,
          link: `/${project.slug}/${name}/`,
        });
      } else if (entry.isDirectory()) {
        // Recursively handle subdirectories
        const subItems = await generateSubdirectoryItems(project.slug, entry.name);
        if (subItems.length > 0) {
          items.push({
            label: formatLabel(entry.name),
            items: subItems,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory: ${projectDocsPath}`);
  }
  
  return items;
}

/**
 * Generate nav items for a subdirectory
 */
async function generateSubdirectoryItems(projectSlug: string, subdir: string): Promise<SidebarItem[]> {
  const subdirPath = join(CONTENT_DIR, projectSlug, subdir);
  const items: SidebarItem[] = [];
  
  try {
    const entries = await readdir(subdirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        const name = basename(entry.name, entry.name.endsWith('.mdx') ? '.mdx' : '.md');
        const label = formatLabel(name);
        
        items.push({
          label,
          link: `/${projectSlug}/${subdir}/${name}/`,
        });
      }
    }
  } catch (error) {
    console.warn(`Could not read subdirectory: ${subdirPath}`);
  }
  
  return items;
}

/**
 * Format a filename into a readable label
 */
function formatLabel(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Write the updated Astro config with sidebar
 */
async function writeAstroConfig(sidebar: (SidebarGroup | SidebarItem)[]): Promise<void> {
  const config = `import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'ScottyLabs Docs',
      description: 'Unified documentation for ScottyLabs projects',
      social: {
        github: 'https://github.com/ScottyLabs',
      },
      sidebar: ${JSON.stringify(sidebar, null, 8).replace(/"([^"]+)":/g, '$1:')},
      customCss: [
        './src/styles/scalar-theme.css',
      ],
    }),
  ],
});
`;
  
  await writeFile('astro.config.mjs', config);
  console.log('  ✓ astro.config.mjs updated with dynamic sidebar');
}
