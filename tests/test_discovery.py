#!/usr/bin/env python3
"""Checks governance discovery against the shape of governance's data/teams/*.yaml.

Run: python3 tests/test_discovery.py   (from the documentation repo root)
The yq-backed cases are skipped when yq is not on PATH.
"""
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import build  # noqa: E402

TEAM_YAML = """\
team:
  name: DevOps
  slug: devops
  repos:
    - name: team-level-repo
  projects:
    - slug: kennel
      repos:
        - name: kennel
          features:
            kennel: {}
        - name: flagged
          features:
            docs: {}
        - name: infrastructure-vendor
          private: true
"""

OTHER_YAML = """\
team:
  name: OCC
  slug: occ
  projects:
    - repos:
        - name: has-website
          url: https://api.example.invalid
"""


def write_governance(root: Path) -> Path:
    teams = root / "governance" / "data" / "teams"
    teams.mkdir(parents=True)
    (teams / "devops.yaml").write_text(TEAM_YAML, encoding="utf-8")
    (teams / "occ.yaml").write_text(OTHER_YAML, encoding="utf-8")
    return root / "governance"


def test_discovers_every_public_repo(tmp: Path) -> None:
    projects = build.discover_governance(write_governance(tmp))
    by_slug = {p["slug"]: p for p in projects}

    # Inclusion is automatic: repos without a docs feature are aggregated too,
    # and private repos are the one exclusion.
    assert set(by_slug) == {"team-level-repo", "kennel", "flagged", "has-website"}, by_slug

    # `url` is the project's website, not a git remote: clone by org name anyway.
    assert by_slug["has-website"]["repo"] == "https://git.cmu.dev/ScottyLabs/has-website"
    assert by_slug["kennel"]["repo"] == "https://git.cmu.dev/ScottyLabs/kennel"

    assert by_slug["kennel"]["docs_dir"] == "docs"
    assert by_slug["flagged"]["name"] == "Flagged"


def test_missing_team_dir_is_not_fatal(tmp: Path) -> None:
    empty = tmp / "no-governance"
    empty.mkdir()
    assert build.discover_governance(empty) == []


def test_mapping_without_yq() -> None:
    # projects_from_teams is the pure half: it must walk both team-level and
    # project-level repo lists even when those keys are missing or null.
    projects = build.projects_from_teams([
        {"team": {"repos": None, "projects": [{"repos": [{"name": "a"}]}]}},
        {"team": {"repos": [{"name": "b"}]}},
        {},
    ])
    assert [p["slug"] for p in projects] == ["a", "b"]


def test_real_governance_if_present() -> None:
    gov = Path("../governance")
    if not (gov / "data" / "teams").is_dir():
        print("  skip: no sibling governance checkout")
        return
    projects = build.discover_governance(gov)
    assert len(projects) > 20, f"expected the full org, got {len(projects)}"
    assert all(p["slug"] and p["repo"] for p in projects)
    print(f"  sibling governance: {len(projects)} repos discovered")


def main() -> None:
    if shutil.which("yq") is None:
        sys.exit("yq not on PATH; run under: nix shell nixpkgs#python3 nixpkgs#yq-go --command python3 tests/test_discovery.py")
    test_mapping_without_yq()
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        test_discovers_every_public_repo(tmp)
        test_missing_team_dir_is_not_fatal(tmp)
    test_real_governance_if_present()
    print("ok")


if __name__ == "__main__":
    main()
