import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import { remarkQuote } from './src/plugins/remark-quote.js';

function quoteBoxIntegration() {
  return {
    name: 'quote-box',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [...(config.markdown?.remarkPlugins || []), remarkQuote],
          },
        });
      },
    },
  };
}

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
                label: "ScottyLabs Documentation Hub",
                link: "/scottylabs/",
                autogenerate: {
                        directory: "scottylabs",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Dalmatian",
                link: "/dalmatian/",
                autogenerate: {
                        directory: "dalmatian",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "CMUHousing",
                link: "/housing/",
                autogenerate: {
                        directory: "housing",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Tartan Vote",
                link: "/tartan-vote/",
                autogenerate: {
                        directory: "tartan-vote",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "ScottyLabs Infrastructure",
                link: "/infrastructure/",
                autogenerate: {
                        directory: "infrastructure",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "ScottyLabs Documentation Hub",
                link: "/documentation/",
                autogenerate: {
                        directory: "documentation",
                        collapsed: true
                },
                collapsed: true
        },
        {
                label: "Courses",
                link: "/courses/",
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
        './src/styles/excalidraw.css',
        './src/styles/quote.css',
      ],
    }),
    quoteBoxIntegration(),
  ],
});
