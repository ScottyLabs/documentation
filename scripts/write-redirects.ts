/**
 * Write static redirect pages for legacy doc URLs (case variants, /index/ paths).
 * Run after `astro build`.
 */

import { writeRedirectPages } from './redirects.ts';

await writeRedirectPages();
