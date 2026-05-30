const SCOTTYLABS_CODEBERG = 'https://codeberg.org/ScottyLabs';
const SCOTTYLABS_GITHUB = 'https://github.com/ScottyLabs';
const DOCS_HUB_SLUG = 'documentation';

export interface RepoLinks {
  slug: string;
  codeberg: string;
  github: string;
}

function slugFromRepoUrl(repo: string): string {
  const normalized = repo.replace(/\.git$/, '').replace(/\/$/, '');
  return normalized.split('/').pop() ?? DOCS_HUB_SLUG;
}

export function repoLinksFromEntry(entry: {
  data: { project?: string; repo?: string };
}): RepoLinks {
  const slug = entry.data.project ?? (entry.data.repo ? slugFromRepoUrl(entry.data.repo) : DOCS_HUB_SLUG);

  if (entry.data.repo) {
    const repo = entry.data.repo.replace(/\.git$/, '');
    if (repo.includes('codeberg.org')) {
      return { slug, codeberg: repo, github: `${SCOTTYLABS_GITHUB}/${slug}` };
    }
    if (repo.includes('github.com')) {
      return { slug, codeberg: `${SCOTTYLABS_CODEBERG}/${slug}`, github: repo };
    }
    return { slug, codeberg: repo, github: `${SCOTTYLABS_GITHUB}/${slug}` };
  }

  return {
    slug,
    codeberg: `${SCOTTYLABS_CODEBERG}/${slug}`,
    github: `${SCOTTYLABS_GITHUB}/${slug}`,
  };
}
