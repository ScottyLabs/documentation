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

## For Contributors

To add your project to this documentation hub, see the [Contributing Guide](#contributing).

### Contributing

To add a project to this hub:

1. Fork the documentation repository
2. Add your project to `projects.toml`
3. Ensure your project has documentation in a `docs/` directory
4. Submit a pull request

The build system will automatically:
- Clone your repository
- Extract documentation
- Generate API references (if applicable)
- Build and deploy the unified site
