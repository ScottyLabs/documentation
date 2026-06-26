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
                label: "ScottyLabs",
                autogenerate: {
                        directory: "scottylabs",
                        collapsed: true
                }
        },
        {
                label: "Bus Sign",
                link: "/bus-sign/"
        },
        {
                label: "groupme-mirror",
                link: "/groupme-mirror/"
        },
        {
                label: "Dalmatian",
                autogenerate: {
                        directory: "dalmatian",
                        collapsed: true
                }
        },
        {
                label: "Discord Verify",
                link: "/discord-verify/"
        },
        {
                label: "@scottylabs/components",
                link: "/components/"
        },
        {
                label: "ScottyLabs.org!",
                link: "/scottylabs-org/"
        },
        {
                label: "Terrier",
                link: "/terrier/"
        },
        {
                label: "ScottyStack",
                link: "/cmugpt-surface/"
        },
        {
                label: "Python Template",
                link: "/cmugpt-agent/"
        },
        {
                label: "ScottyLabs MCPs",
                link: "/mcp-server/"
        },
        {
                label: "cmugpt-sms-surface",
                link: "/cmugpt-sms-surface/"
        },
        {
                label: "CMUHousing",
                autogenerate: {
                        directory: "housing",
                        collapsed: true
                }
        },
        {
                label: "Tartan Vote",
                autogenerate: {
                        directory: "tartan-vote",
                        collapsed: true
                }
        },
        {
                label: "ScottyLabs Infrastructure",
                autogenerate: {
                        directory: "infrastructure",
                        collapsed: true
                }
        },
        {
                label: "Governance",
                link: "/governance/"
        },
        {
                label: "observability",
                link: "/observability/"
        },
        {
                label: "Documentation Hub",
                autogenerate: {
                        directory: "documentation",
                        collapsed: true
                }
        },
        {
                label: "CMU Courses Internet Archive",
                link: "/internet-archive/"
        },
        {
                label: "Courses",
                autogenerate: {
                        directory: "courses",
                        collapsed: true
                }
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
