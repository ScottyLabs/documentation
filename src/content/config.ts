import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ 
    schema: docsSchema({
      extend: z.object({
        project: z.string().optional(),
        projectType: z.enum(['starlight', 'rust', 'openapi']).optional(),
      }),
    }),
  }),
};
