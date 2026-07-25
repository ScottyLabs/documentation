#!/usr/bin/env python3
"""
ScottyLabs documentation hub build.

Aggregates project docs from sibling repos / Codeberg clones, generates
SUMMARY.md and repos.json, then runs mdbook.  Projects with type="nix" are
built via `nix build .#docs` after mdbook and their HTML is dropped directly
into the book output directory.  Projects with type="mdbook" are built via
`mdbook build` inside the cloned repo and injected the same way.

Depends only on Python 3.11+ stdlib (tomllib) + git + mdbook in PATH.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

CONTENT_DIR = Path("src/content/docs")
REPOS_DIR   = Path(".repos")
MANIFEST    = Path("projects.toml")

# Files never aggregated from source repos
SKIP_FILES  = frozenset({"AGENTS.md", "SUMMARY.md", "SUMMARY.mdx"})
SKIP_INDEX  = frozenset({"README.md", "readme.md"})
# Shell pages that live at the CONTENT_DIR root and must not be overwritten
SKIP_SHELL  = frozenset({"index.md", "getting-started.md", "404.md", "favicon.ico", "repos.json"})
# Directories never aggregated (build outputs, package caches, etc.)
SKIP_DIRS   = frozenset({"book", "target", "node_modules", "dist", "vendor"})

# These slugs read from the documentation hub itself, not a cloned repo
HUB_LOCAL_SLUGS = frozenset({"documentation", "scottylabs"})


# ── Helpers ──────────────────────────────────────────────────────────────────

def codeberg(name: str) -> str:
    return f"https://codeberg.org/ScottyLabs/{name}"

def title_case(slug: str) -> str:
    return " ".join(w.capitalize() for w in re.split(r"[-_ ]+", slug) if w)

def fmt_stem(stem: str) -> str:
    return title_case(stem)


# ── Manifest ─────────────────────────────────────────────────────────────────

def load_manifest() -> list[dict]:
    if not MANIFEST.exists():
        return []
    with open(MANIFEST, "rb") as f:
        data = tomllib.load(f)
    out = []
    for p in data.get("project", []):
        out.append({
            "slug":     p["slug"],
            "name":     p.get("name", title_case(p["slug"])),
            "repo":     p.get("repo", codeberg(p["slug"])),
            "type":     p.get("type", "starlight"),
            "docs_dir": p.get("docs_dir", "docs"),
            "sibling":  p.get("sibling"),
        })
    return out


# ── Governance discovery ─────────────────────────────────────────────────────

def governance_path() -> Path | None:
    sibling = Path("../governance")
    if sibling.is_dir():
        print(f"  ✓ Using monorepo governance at {sibling}")
        return sibling
    dest = REPOS_DIR / "governance"
    if dest.is_dir():
        return dest
    print("  Cloning governance...")
    r = subprocess.run(
        ["git", "clone", "--depth=1", "--quiet", codeberg("governance"), str(dest)],
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        capture_output=True,
    )
    if r.returncode != 0:
        msg = (r.stderr.decode().splitlines() or ["clone failed"])[-1]
        print(f"  ⚠  Could not clone governance: {msg}")
        return None
    return dest


def discover_governance(gov: Path) -> list[dict]:
    teams_dir = gov / "data" / "teams"
    if not teams_dir.is_dir():
        return []
    projects: list[dict] = []
    for toml_file in sorted(teams_dir.glob("*.toml")):
        try:
            with open(toml_file, "rb") as f:
                data = tomllib.load(f)
        except Exception as exc:
            print(f"  ⚠  Skipping {toml_file.name}: {exc}")
            continue
        team = data.get("team", {})
        for repo in team.get("repos", []):
            _add_project(projects, repo)
        for proj in team.get("projects", []):
            for repo in proj.get("repos", []):
                _add_project(projects, repo)
    return projects


def _add_project(projects: list[dict], repo: dict) -> None:
    name = repo.get("name", "")
    if not name or repo.get("docs") is False:
        return
    projects.append({
        "slug":     name,
        "name":     title_case(name),
        "repo":     repo.get("repo", codeberg(name)),
        "type":     "starlight",
        "docs_dir": repo.get("docs_dir", "docs"),
    })


def merge_projects(governance: list[dict], manual: list[dict]) -> list[dict]:
    """Manual entries take priority over governance-discovered ones."""
    by_slug: dict[str, dict] = {p["slug"]: p for p in governance}
    for p in manual:
        by_slug[p["slug"]] = p
    return list(by_slug.values())


# ── Repo resolution ──────────────────────────────────────────────────────────

def resolve_roots(projects: list[dict]) -> dict[str, Path]:
    REPOS_DIR.mkdir(exist_ok=True)
    roots: dict[str, Path] = {}
    print(f"\n📦 Resolving {len(projects)} project repositories...\n")
    for p in projects:
        slug = p["slug"]
        if slug in HUB_LOCAL_SLUGS:
            roots[slug] = Path(".")
            continue
        path = _resolve_one(p)
        if path:
            roots[slug] = path
    return roots


def _resolve_one(p: dict) -> Path | None:
    sibling = Path("..") / (p.get("sibling") or p["slug"])
    if sibling.is_dir() and any(e for e in sibling.iterdir() if e.name != ".git"):
        print(f"  ✓ {p['name']} ({p['slug']}) → monorepo {sibling}")
        return sibling

    dest = REPOS_DIR / p["slug"]
    if dest.is_dir():
        print(f"  ✓ {p['name']} ({p['slug']}) already cloned")
        return dest

    print(f"  Cloning {p['name']} ({p['slug']})...")
    r = subprocess.run(
        ["git", "clone", "--depth=1", "--single-branch", "--quiet", p["repo"], str(dest)],
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        capture_output=True,
    )
    if r.returncode != 0:
        lines = r.stderr.decode().splitlines()
        print(f"  ⚠  Skipping {p['name']}: {lines[-1] if lines else 'clone failed'}")
        return None
    print(f"  ✓ {p['name']} ({p['slug']}) cloned")
    return dest


# ── Markdown aggregation ─────────────────────────────────────────────────────

def aggregate(projects: list[dict], roots: dict[str, Path]) -> None:
    print("\n📚 Aggregating documentation...\n")
    for p in projects:
        root = roots.get(p["slug"])
        if root is None:
            continue
        _aggregate_project(p, root)
    print("✅ Documentation aggregated\n")


def _aggregate_project(p: dict, root: Path) -> None:
    print(f"  Processing {p['name']}...")

    if p.get("type") == "mdbook":
        # mdbook projects are built by build_mdbook_docs() and injected directly
        # into book/<slug>/ after the hub mdbook run; no aggregation or SUMMARY
        # entry needed.
        print(f"  ↷ {p['name']} (mdbook): built separately, skipping aggregation")
        return

    is_hub  = p["slug"] in HUB_LOCAL_SLUGS
    src_dir = root / p.get("docs_dir", "docs")
    target  = CONTENT_DIR / p["slug"]

    shutil.rmtree(target, ignore_errors=True)
    target.mkdir(parents=True)

    has_docs = src_dir.is_dir()
    if has_docs:
        _copy_tree(src_dir, target, p, is_hub=is_hub)

    # Fall back to repo README as homepage if no index.md produced
    if not (target / "index.md").exists():
        readme = root / "README.md"
        if readme.exists():
            _process(readme, target / "index.md", p, root_file=True)
            print(f"  ✓ Using README.md as homepage for {p['name']}")
        elif not has_docs:
            print(f"  ⚠  No docs or README.md for {p['name']}")
            return

    print(f"  ✓ {p['name']} docs → {target}")


def _copy_tree(src: Path, dst: Path, p: dict, *, is_hub: bool, rel: str = "") -> None:
    for entry in sorted(src.iterdir()):
        if entry.is_dir():
            # skip hidden dirs (.obsidian, .forgejo, .rules, etc.) and
            # well-known build output dirs that should never be aggregated
            if entry.name.startswith(".") or entry.name in SKIP_DIRS:
                continue
            sub = dst / entry.name
            sub.mkdir(exist_ok=True)
            _copy_tree(entry, sub, p, is_hub=is_hub, rel=f"{rel}/{entry.name}" if rel else entry.name)
            if not any(sub.iterdir()):   # prune empty dirs
                sub.rmdir()
        elif entry.is_file() and entry.suffix == ".md":
            name = entry.name
            if name in SKIP_FILES or name in SKIP_INDEX:
                continue
            if is_hub and name in SKIP_SHELL:
                continue
            is_root = name in ("index.md",)
            _process(entry, dst / name, p, root_file=is_root)


def _strip_frontmatter(text: str) -> str:
    return re.sub(r"^---\n[\s\S]*?\n---\n", "", text, count=1)


def _process(src: Path, dst: Path, p: dict, *, root_file: bool) -> None:
    text = src.read_text(encoding="utf-8", errors="replace")
    body = _strip_frontmatter(text)

    if root_file:
        # Strip markdown H1 and decorative HTML title divs (e.g. GitHub READMEs);
        # replace with the canonical project name so titles are consistent.
        body = re.sub(r"^#\s+.+?(?:\s*\{#[^}]*\})?\s*\n", "", body, count=1)
        body = re.sub(r"^\s*<div[^>]*>[\s\S]*?</div>\s*\n*", "", body, count=1, flags=re.IGNORECASE)
        body = body.lstrip("\n")
        preamble = f"# {p['name']}\n\n"
    else:
        body = body.lstrip("\n")
        if re.search(r"^#\s+", body, re.MULTILINE):
            preamble = ""
        else:
            base = src.stem.lower()
            title = p["name"] if base in ("index", "readme") else fmt_stem(src.stem)
            preamble = f"# {title}\n\n"

    dst.write_text(preamble + body, encoding="utf-8")


# ── repos.json ───────────────────────────────────────────────────────────────

def write_repos(projects: list[dict]) -> None:
    mapping = {p["slug"]: p["repo"] for p in projects if p.get("repo")}
    (CONTENT_DIR / "repos.json").write_text(json.dumps(mapping), encoding="utf-8")


# ── SUMMARY.md ───────────────────────────────────────────────────────────────

def generate_summary(projects: list[dict]) -> None:
    print("\n🧭 Generating SUMMARY.md...\n")
    lines = ["# Summary", ""]
    lines.append("- [Home](index.md)")
    if (CONTENT_DIR / "getting-started.md").exists():
        lines.append("- [Getting Started](getting-started.md)")
    lines += ["", "---", ""]

    # scottylabs org docs first, then alphabetical order
    ordered = sorted(projects, key=lambda p: (0 if p["slug"] == "scottylabs" else 1, p["slug"]))
    for p in ordered:
        if p.get("type") == "mdbook":
            continue  # built separately, injected post-mdbook; no sidebar entry
        entry = _summary_entry(p)
        if entry:
            lines.append(entry)

    (CONTENT_DIR / "SUMMARY.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("✅ SUMMARY.md generated\n")


def _summary_entry(p: dict) -> str | None:
    d = CONTENT_DIR / p["slug"]
    if not d.is_dir() or not any(d.rglob("*.md")):
        return None
    label   = _group_label(p)
    has_ix  = (d / "index.md").exists()
    root    = f"- [{label}]({p['slug']}/index.md)" if has_ix else f"- [{label}]()"
    subs    = _sub_lines(p["slug"], d, "  ")
    return root + ("\n" + "\n".join(subs) if subs else "")


def _group_label(p: dict) -> str:
    ix = CONTENT_DIR / p["slug"] / "index.md"
    if ix.exists():
        m = re.search(r"^#\s+(.+?)(?:\s*\{#[^}]*\})?\s*$", ix.read_text(), re.MULTILINE)
        if m:
            return m.group(1).strip()
    return p["name"]


def _sub_lines(slug: str, d: Path, indent: str, rel: str = "") -> list[str]:
    lines: list[str] = []
    try:
        entries = sorted(d.iterdir(), key=lambda e: (0 if e.is_dir() else 1, e.name.lower()))
    except OSError:
        return lines
    for e in entries:
        if e.is_dir():
            sub_rel  = f"{rel}/{e.name}" if rel else e.name
            ix_path  = f"{slug}/{sub_rel}/index.md" if (e / "index.md").exists() else ""
            lines.append(f"{indent}- [{fmt_stem(e.name)}]({ix_path})")
            lines.extend(_sub_lines(slug, e, indent + "  ", sub_rel))
        elif e.is_file() and e.suffix == ".md" and e.name != "index.md":
            path = f"{slug}/{rel}/{e.stem}.md" if rel else f"{slug}/{e.stem}.md"
            lines.append(f"{indent}- [{fmt_stem(e.stem)}]({path})")
    return lines


# ── Favicon (mdbook copies non-.md files from src) ───────────────────────────

def copy_favicon() -> None:
    src = Path("public/favicon.ico")
    dst = CONTENT_DIR / "favicon.ico"
    if src.exists() and not dst.exists():
        shutil.copy2(src, dst)


# ── mdbook-built documentation ────────────────────────────────────────────────

def build_mdbook_docs(projects: list[dict], roots: dict[str, Path]) -> None:
    """Build external repos that carry their own book.toml.

    Runs `mdbook build` inside the cloned/sibling repo, then copies the
    resulting book/ directory to book/<slug>/ in the hub output.  These
    projects get their own independent sidebar and are not listed in the hub
    SUMMARY.md; accessible at the URL but not surfaced in the hub nav.
    """
    mdbook_projects = [p for p in projects if p.get("type") == "mdbook" and p["slug"] in roots]
    if not mdbook_projects:
        return
    print("\n📖 Building external mdbook projects...\n")
    book_dir = Path("book")
    for p in mdbook_projects:
        root = roots[p["slug"]]
        print(f"  Building {p['name']} (mdbook build in {root})...")
        r = subprocess.run(
            ["mdbook", "build"],
            cwd=root,
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            print(f"  ⚠  mdbook build failed for {p['name']}, skipping:\n{r.stderr.strip()}")
            continue
        src = root / "book"
        dest = book_dir / p["slug"]
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(src, dest)
        print(f"  ✓ {p['name']} → {dest}")
    print("✅ External mdbook docs built\n")


# ── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    print("🚀 ScottyLabs Documentation Hub Build\n")

    manual   = load_manifest()
    print(f"📋 Manual manifest: {len(manual)} project(s)\n")

    gov = governance_path()
    gov_projects = discover_governance(gov) if gov else []
    projects = merge_projects(gov_projects, manual)
    print(f"📦 Total projects: {len(projects)}\n")

    roots = resolve_roots(projects)
    aggregate(projects, roots)
    copy_favicon()
    write_repos(projects)
    generate_summary(projects)

    print("📖 Running mdbook build...")
    r = subprocess.run(["mdbook", "build"])
    if r.returncode != 0:
        sys.exit(r.returncode)

    build_mdbook_docs(projects, roots)

    print("\n✨ Build complete\n")


if __name__ == "__main__":
    main()
