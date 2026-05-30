---
title: Getting Started
description: Learn how to use and contribute to ScottyLabs projects
---

# Getting Started

Welcome! This documentation hub aggregates documentation from multiple ScottyLabs repositories.

## For Users

Each project has its own section in the sidebar with:
- **Guides**: Step-by-step tutorials
- **API Docs**: Interactive API references (for projects with APIs)
- **Rustdoc**: Generated documentation for Rust code

### Contributing

To add a project to this hub, add `docs: true` flag in governance

The build system will automatically:
- Clone your repository
- Extract documentation
- Generate API references (if applicable)
- Build and deploy the unified site
