#!/usr/bin/env python3
"""Checks governance discovery against the shape of governance's generated/data.json.

Run: python3 tests/test_discovery.py   (from the documentation repo root)
"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import build  # noqa: E402

FIXTURE = {
    "teams": [
        {
            "team": {
                "slug": "devops",
                "repos": [{"name": "team-level-repo", "url": None, "features": {}}],
                "projects": [
                    {
                        "slug": "kennel",
                        "repos": [
                            {"name": "kennel", "features": {"kennel": {}}},
                            {"name": "flagged", "features": {"docs": {}}},
                        ],
                    }
                ],
            }
        },
        {
            "team": {
                "slug": "occ",
                "repos": [],
                "projects": [
                    {"repos": [{"name": "elsewhere", "url": "https://example.invalid/elsewhere"}]}
                ],
            }
        },
    ]
}


def write_governance(root: Path, data: dict) -> Path:
    gov = root / "governance"
    (gov / "generated").mkdir(parents=True)
    (gov / "generated" / "data.json").write_text(json.dumps(data), encoding="utf-8")
    return gov


def test_discovers_every_registered_repo(tmp: Path) -> None:
    projects = build.discover_governance(write_governance(tmp, FIXTURE))
    by_slug = {p["slug"]: p for p in projects}

    # Inclusion is automatic: repos without a docs feature are aggregated too.
    assert set(by_slug) == {"team-level-repo", "kennel", "flagged", "elsewhere"}, by_slug

    # An explicit url wins; otherwise the repo is assumed to live in the org.
    assert by_slug["elsewhere"]["repo"] == "https://example.invalid/elsewhere"
    assert by_slug["kennel"]["repo"] == "https://git.cmu.dev/ScottyLabs/kennel"
    # url: null must not override the default.
    assert by_slug["team-level-repo"]["repo"].endswith("/team-level-repo")

    assert by_slug["kennel"]["docs_dir"] == "docs"
    assert by_slug["flagged"]["name"] == "Flagged"


def test_missing_data_json_is_not_fatal(tmp: Path) -> None:
    empty = tmp / "no-governance"
    empty.mkdir()
    assert build.discover_governance(empty) == []


def test_real_governance_if_present() -> None:
    gov = Path("../governance")
    if not (gov / "generated" / "data.json").is_file():
        print("  skip: no sibling governance checkout")
        return
    projects = build.discover_governance(gov)
    assert len(projects) > 20, f"expected the full org, got {len(projects)}"
    assert all(p["slug"] and p["repo"] for p in projects)
    print(f"  sibling governance: {len(projects)} repos discovered")


def main() -> None:
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        test_discovers_every_registered_repo(tmp)
        test_missing_data_json_is_not_fatal(tmp)
    test_real_governance_if_present()
    print("ok")


if __name__ == "__main__":
    main()
