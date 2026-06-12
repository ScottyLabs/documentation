import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  trailingSlash: 'always',
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
      sidebar: [
        {
                label: "Welcome",
                collapsed: true,
                items: [
                        {
                                label: "Home",
                                link: "/"
                        },
                        {
                                label: "Getting Started",
                                link: "/getting-started/"
                        }
                ]
        },
        {
                label: "ScottyLabs",
                autogenerate: {
                        directory: "scottylabs",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Tartan Vote",
                autogenerate: {
                        directory: "tartan-vote",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Infrastructure",
                autogenerate: {
                        directory: "infrastructure",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Governance",
                autogenerate: {
                        directory: "governance",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Documentation Hub",
                autogenerate: {
                        directory: "documentation",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Courses",
                autogenerate: {
                        directory: "courses",
                        collapsed: true
                },
                collapsed: true
        }
],
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
      ],
    }),
  ],
});
