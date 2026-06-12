/**
 * Verify every HTML page in dist/ has a Markdown counterpart for Accept negotiation.
 */

import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const DIST_DIR = 'dist';

function htmlToMarkdownCounterpart(htmlPath: string): string {
  const dir = dirname(htmlPath);
  const name = basename(htmlPath);
  if (name === 'index.html') {
    return join(dir, 'index.md');
  }
  return join(dir, name.replace(/\.html$/i, '.md'));
}

async function main(): Promise<void> {
  console.log('\n🔍 Verifying Accept Markdown export...\n');

  const missing: string[] = [];
  const empty: string[] = [];
  let htmlCount = 0;

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.html')) {
        continue;
      }

      htmlCount += 1;
      const mdPath = htmlToMarkdownCounterpart(fullPath);

      try {
        const mdStat = await stat(mdPath);
        if (mdStat.size === 0) {
          empty.push(mdPath);
        }
      } catch {
        missing.push(fullPath);
      }
    }
  }

  try {
    await stat(DIST_DIR);
  } catch {
    console.error('❌ dist/ not found — run build first');
    process.exit(1);
  }

  await walk(DIST_DIR);

  if (missing.length > 0) {
    console.error(`❌ ${missing.length} HTML page(s) missing Markdown counterpart:`);
    for (const path of missing.slice(0, 20)) {
      console.error(`  - ${path}`);
    }
    if (missing.length > 20) {
      console.error(`  ... and ${missing.length - 20} more`);
    }
    process.exit(1);
  }

  if (empty.length > 0) {
    console.error(`❌ ${empty.length} Markdown file(s) are empty:`);
    for (const path of empty.slice(0, 20)) {
      console.error(`  - ${path}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${htmlCount} HTML pages have non-empty Markdown counterparts\n`);
}

await main();
