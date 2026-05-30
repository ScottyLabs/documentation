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
      sidebar: [
        {
          label: 'Welcome',
          items: [
            { label: 'Getting Started', link: '/getting-started/' },
          ],
        },
        // Project sections will be dynamically added here by build script
      ],
      customCss: [
        './src/styles/scalar-theme.css',
      ],
    }),
  ],
});
