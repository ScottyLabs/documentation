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
                items: [
                        {
                                label: "Overview",
                                link: "/scottylabs/"
                        },
                        {
                                label: "Community",
                                items: [
                                        {
                                                label: "Communication",
                                                link: "/scottylabs/community/communication/"
                                        },
                                        {
                                                label: "Resources",
                                                link: "/scottylabs/community/resources/"
                                        }
                                ]
                        },
                        {
                                label: "Design",
                                items: [
                                        {
                                                label: "Design System",
                                                link: "/scottylabs/design/design-system/"
                                        },
                                        {
                                                label: "Diagramming",
                                                link: "/scottylabs/design/diagramming/"
                                        }
                                ]
                        },
                        {
                                label: "Development",
                                items: [
                                        {
                                                label: "Ai Code Reviewers",
                                                link: "/scottylabs/development/ai-code-reviewers/"
                                        },
                                        {
                                                label: "Deprecation Guideline",
                                                link: "/scottylabs/development/deprecation-guideline/"
                                        },
                                        {
                                                label: "Git Best Practices",
                                                link: "/scottylabs/development/git-best-practices/"
                                        },
                                        {
                                                label: "Pr Process",
                                                link: "/scottylabs/development/pr-process/"
                                        }
                                ]
                        },
                        {
                                label: "Onboarding",
                                items: [
                                        {
                                                label: "Codeberg Setup",
                                                link: "/scottylabs/onboarding/codeberg-setup/"
                                        },
                                        {
                                                label: "Contributing",
                                                link: "/scottylabs/onboarding/contributing/"
                                        },
                                        {
                                                label: "Labrador To Tech",
                                                link: "/scottylabs/onboarding/labrador-to-tech/"
                                        }
                                ]
                        },
                        {
                                label: "Organization",
                                items: [
                                        {
                                                label: "Projects",
                                                link: "/scottylabs/organization/projects/"
                                        }
                                ]
                        },
                        {
                                label: "Platform",
                                items: [
                                        {
                                                label: "Credentials",
                                                link: "/scottylabs/platform/credentials/"
                                        },
                                        {
                                                label: "Emails",
                                                link: "/scottylabs/platform/emails/"
                                        },
                                        {
                                                label: "Github Orgs",
                                                link: "/scottylabs/platform/github-orgs/"
                                        }
                                ]
                        }
                ]
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
                items: [
                        {
                                label: "Overview",
                                link: "/dalmatian/"
                        },
                        {
                                label: "Contributing",
                                link: "/dalmatian/contributing/"
                        },
                        {
                                label: "Setup",
                                link: "/dalmatian/setup/"
                        }
                ]
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
                items: [
                        {
                                label: "Overview",
                                link: "/housing/"
                        },
                        {
                                label: "Contributing",
                                link: "/housing/contributing/"
                        },
                        {
                                label: "Setup",
                                link: "/housing/setup/"
                        }
                ]
        },
        {
                label: "Tartan Vote",
                items: [
                        {
                                label: "Overview",
                                link: "/tartan-vote/"
                        },
                        {
                                label: "Crates",
                                items: [
                                        {
                                                label: "Voting App",
                                                items: [
                                                        {
                                                                label: "Auth",
                                                                link: "/tartan-vote/crates/voting-app/auth/"
                                                        },
                                                        {
                                                                label: "Fonts",
                                                                link: "/tartan-vote/crates/voting-app/fonts/"
                                                        }
                                                ]
                                        }
                                ]
                        },
                        {
                                label: "Db",
                                items: [
                                        {
                                                label: "Db Json",
                                                link: "/tartan-vote/db/db-json/"
                                        },
                                        {
                                                label: "Db Migration",
                                                link: "/tartan-vote/db/db-migration/"
                                        },
                                        {
                                                label: "Db Schema",
                                                link: "/tartan-vote/db/db-schema/"
                                        }
                                ]
                        },
                        {
                                label: "Frontend",
                                items: [
                                        {
                                                label: "Proxy Setup Debug",
                                                link: "/tartan-vote/frontend/proxy-setup-debug/"
                                        }
                                ]
                        },
                        {
                                label: "Process",
                                items: [
                                        {
                                                label: "Proxy Voting Implementation",
                                                link: "/tartan-vote/process/proxy-voting-implementation/"
                                        },
                                        {
                                                label: "Proxy Voting Testing",
                                                link: "/tartan-vote/process/proxy-voting-testing/"
                                        }
                                ]
                        },
                        {
                                label: "Contributing",
                                link: "/tartan-vote/contributing/"
                        },
                        {
                                label: "Secrets And Config",
                                link: "/tartan-vote/secrets-and-config/"
                        },
                        {
                                label: "Setup",
                                link: "/tartan-vote/setup/"
                        }
                ]
        },
        {
                label: "ScottyLabs Infrastructure",
                items: [
                        {
                                label: "Overview",
                                link: "/infrastructure/"
                        },
                        {
                                label: "Secrets",
                                items: [
                                        {
                                                label: "01 Creating Secrets",
                                                link: "/infrastructure/secrets/01-creating-secrets/"
                                        },
                                        {
                                                label: "02 Using Secrets",
                                                link: "/infrastructure/secrets/02-using-secrets/"
                                        },
                                        {
                                                label: "03 Openbao",
                                                link: "/infrastructure/secrets/03-openbao/"
                                        }
                                ]
                        },
                        {
                                label: "Setup",
                                items: [
                                        {
                                                label: "01 Purchasing Vm",
                                                link: "/infrastructure/setup/01-purchasing-vm/"
                                        },
                                        {
                                                label: "02 Preparing For Setup",
                                                link: "/infrastructure/setup/02-preparing-for-setup/"
                                        },
                                        {
                                                label: "03 Installing Nixos",
                                                link: "/infrastructure/setup/03-installing-nixos/"
                                        },
                                        {
                                                label: "04 Post Installation Setup",
                                                link: "/infrastructure/setup/04-post-installation-setup/"
                                        }
                                ]
                        },
                        {
                                label: "Create User Entry",
                                link: "/infrastructure/create-user-entry/"
                        },
                        {
                                label: "Troubleshooting",
                                link: "/infrastructure/troubleshooting/"
                        }
                ]
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
                items: [
                        {
                                label: "Overview",
                                link: "/documentation/"
                        },
                        {
                                label: "Contributing",
                                link: "/documentation/contributing/"
                        },
                        {
                                label: "Tech Stack",
                                link: "/documentation/tech-stack/"
                        }
                ]
        },
        {
                label: "CMU Courses Internet Archive",
                link: "/internet-archive/"
        },
        {
                label: "Courses",
                items: [
                        {
                                label: "Overview",
                                link: "/courses/"
                        },
                        {
                                label: "Src",
                                items: [
                                        {
                                                label: "Courses Index",
                                                items: [
                                                        {
                                                                label: "Catalog Format",
                                                                link: "/courses/src/courses-index/catalog-format/"
                                                        },
                                                        {
                                                                label: "Facets",
                                                                link: "/courses/src/courses-index/facets/"
                                                        },
                                                        {
                                                                label: "Query",
                                                                link: "/courses/src/courses-index/query/"
                                                        },
                                                        {
                                                                label: "Text Search",
                                                                link: "/courses/src/courses-index/text-search/"
                                                        }
                                                ]
                                        },
                                        {
                                                label: "Scraper",
                                                items: [
                                                        {
                                                                label: "Discovery",
                                                                link: "/courses/src/scraper/discovery/"
                                                        },
                                                        {
                                                                label: "Programs",
                                                                link: "/courses/src/scraper/programs/"
                                                        },
                                                        {
                                                                label: "Running",
                                                                link: "/courses/src/scraper/running/"
                                                        },
                                                        {
                                                                label: "Stellic",
                                                                link: "/courses/src/scraper/stellic/"
                                                        },
                                                        {
                                                                label: "Syllabi",
                                                                link: "/courses/src/scraper/syllabi/"
                                                        }
                                                ]
                                        },
                                        {
                                                label: "Overview",
                                                link: "/courses/src/overview/"
                                        }
                                ]
                        }
                ]
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
