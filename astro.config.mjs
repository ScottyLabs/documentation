import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'ScottyLabs Docs',
      description: 'Unified documentation for ScottyLabs projects',
      social: {
        github: 'https://github.com/ScottyLabs',
      },
      components: {
        Pagination: './src/components/Pagination.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
      sidebar: [
        {
                label: "Welcome",
                collapsed: false,
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
                label: "Tartan Vote",
                autogenerate: {
                        directory: "tartan-vote",
                        collapsed: false
                },
                collapsed: false
        },
        {
                label: "Infrastructure",
                autogenerate: {
                        directory: "infrastructure",
                        collapsed: false
                },
                collapsed: false
        },
        {
                label: "Governance",
                autogenerate: {
                        directory: "governance",
                        collapsed: false
                },
                collapsed: false
        },
        {
                label: "Documentation",
                autogenerate: {
                        directory: "documentation",
                        collapsed: false
                },
                collapsed: false
        },
        {
                label: "Courses",
                autogenerate: {
                        directory: "courses",
                        collapsed: false
                },
                collapsed: false
        }
],
      customCss: [
        './src/styles/scalar-theme.css',
      ],
    }),
  ],
});
