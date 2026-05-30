---
title: Getting Started
description: Learn how to use and contribute to ScottyLabs projects
project: documentation
repo: https://codeberg.org/ScottyLabs/documentation
---

Welcome! This documentation hub aggregates documentation from multiple ScottyLabs repositories.

## For Users

Each project has its own section in the sidebar with:

- **Guides**: Step-by-step tutorials
- **API Docs**: Interactive API references (for projects with APIs)
- **Rustdoc**: Generated documentation for Rust code

Use **search** (⌘K) or browse the sidebar to find what you need.

## For Contributors

Repositories registered in [governance](https://codeberg.org/ScottyLabs/governance) are included in this hub by default. To exclude a repo, set `docs = false` in its team entry.

The build system automatically:

- Clones your repository
- Copies its `docs/` directory into this site
- Generates API references (if applicable)
- Builds and deploys to [docs.scottylabs.org](https://docs.scottylabs.org)

See the [Documentation Hub](/documentation/) page for the full workflow.
