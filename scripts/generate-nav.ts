/**
 * Navigation generation utilities
 * Dynamically generates Starlight sidebar from project manifest
 */

import { writeFile, stat } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from './manifest.ts';

const CONTENT_DIR = 'src/content/docs';

interface SidebarItem {
  label: string;
  link?: string;
  autogenerate?: { directory: string; collapsed?: boolean };
  items?: SidebarItem[];
}

interface SidebarGroup {
  label: string;
  items?: SidebarItem[];
  autogenerate?: { directory: string; collapsed?: boolean };
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
      collapsed: true,
      items: [
        { label: 'Home', link: '/' },
        { label: 'Getting Started', link: '/getting-started/' },
      ],
    },
  ];
  
  // Add project sections (ScottyLabs org docs first, then everything else)
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.slug === 'scottylabs') return -1;
    if (b.slug === 'scottylabs') return 1;
    return 0;
  });

  for (const project of sortedProjects) {
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
  if (project.type === 'starlight') {
    const projectDocsPath = join(CONTENT_DIR, project.slug);
    try {
      await stat(projectDocsPath);
    } catch {
      return null;
    }

    const hasDocs = await directoryHasMarkdown(projectDocsPath);
    if (!hasDocs) {
      return null;
    }

    // autogenerate keeps nested pages in sync; collapsed: true keeps sections closed
    // on first visit except for the group containing the current page.
    return {
      label: await sidebarGroupLabel(project),
      autogenerate: { directory: project.slug, collapsed: true },
      collapsed: true,
    };
  }

  const items: SidebarItem[] = [];

  if (project.type === 'openapi') {
    items.push({
      label: 'API Reference',
      link: `/${project.slug}/api/`,
    });
  }

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

async function directoryHasMarkdown(dir: string): Promise<boolean> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      return true;
    }
    if (entry.isDirectory() && (await directoryHasMarkdown(path))) {
      return true;
    }
  }
  return false;
}

function titleFromFrontmatter(content: string): string | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return undefined;
  }

  const match = frontmatterMatch[1].match(/^title:\s*(.+)$/m);
  if (!match) {
    return undefined;
  }

  const raw = match[1].trim();
  if (raw.startsWith('"') || raw.startsWith("'")) {
    try {
      return JSON.parse(raw.replace(/^'/, '"').replace(/'$/, '"'));
    } catch {
      return raw.replace(/^['"]|['"]$/g, '');
    }
  }

  return raw;
}

/** Use the index page title as the sidebar group label when one exists. */
async function sidebarGroupLabel(project: Project): Promise<string> {
  for (const filename of ['index.md', 'index.mdx']) {
    const indexPath = join(CONTENT_DIR, project.slug, filename);
    try {
      const content = await Bun.file(indexPath).text();
      const title = titleFromFrontmatter(content);
      if (title) {
        return title;
      }
    } catch {
      continue;
    }
  }

  return project.name;
}

/**
 * Write the updated Astro config with sidebar
 */
async function writeAstroConfig(sidebar: (SidebarGroup | SidebarItem)[]): Promise<void> {
  const config = `import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  trailingSlash: 'always',
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  integrations: [
    mermaid({
      autoTheme: true,
      mermaidConfig: {
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          nodeSpacing: 28,
          rankSpacing: 40,
          padding: 12,
        },
        themeVariables: {
          fontSize: '17px',
        },
      },
    }),
    starlight({
      title: 'ScottyLabs Docs',
      description: 'Unified documentation for ScottyLabs projects',
      favicon: '/favicon.ico',
      social: {
        github: 'https://github.com/ScottyLabs',
      },
      components: {
        MarkdownContent: './src/components/MarkdownContent.astro',
        Pagination: './src/components/Pagination.astro',
      },
      sidebar: ${JSON.stringify(sidebar, null, 8).replace(/"([^"]+)":/g, '$1:')},
      head: [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Cache-Control',
            content: 'no-cache, no-store, must-revalidate',
          },
        },
      ],
      customCss: [
        './src/styles/scalar-theme.css',
        './src/styles/heading-links.css',
        './src/styles/mermaid.css',
        './src/styles/excalidraw.css',
      ],
    }),
  ],
});
`;
  
  await writeFile('astro.config.mjs', config);
  console.log('  ✓ astro.config.mjs updated with dynamic sidebar');
}
