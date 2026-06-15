---
title: Git Best Practices
---

:::quote{author="maybe-yiyi" name="Yiyoung Liu" platform="codeberg"}
"Good commit habits reflect on the developer. Being able to clearly reflect upon your changes and describe the impact of them means you are able to reason about your code and about why you are making the changes you are."
:::

Generally to preserve good git history for readability and revertability, it is best to have some standard practices. Not only would it make it easier for new contributors, it would create a positive look on scottylabs if we have good git history.

## Commit Styles

There are two main commit styles used by ScottyLabs.

### Conventional Commits

Most projects use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) so that we can automatically get a CHANGELOG in git history and communicate the changes to other members and sponsors.

This means that usually the commit is in a format like `<nature>(<scope>): <changes>`. Here nature is the nature of the commit, i.e. if it was a fix, feature, chore, etc. Scope is what the commit deals with, for instance the frontend, docs, or backend. Lastly the changes is what the commits actually changed.

Some of the most common natures are:

- `feat` for new features
- `fix` for bugfixes
- `docs` for changes to documentation
- `chore` for maintenance and routine tasks
- `refactor` for refactors if it does not change behavior (e.g. a library version update)
- `revert` if a previous change was reverted

[This blog](https://www.bavaga.com/blog/2025/01/27/my-ultimate-conventional-commit-types-cheatsheet/) is a pretty good resource.

On many kennel repositories (the ones using devenv and governance PRs) Conventional Commits are enforced by DevOps.

### Kernel Commit Style

Some projects (and Tech Leads) instead prefer [kernel commit style](https://docs.kernel.org/process/submitting-patches.html). Most of the information here is copied over from Tartan Vote's contributing document.

Here, commits are in a format like `<system>: <subsystem if applicable>: <changes>`. System is what the commit deals with, for instance the frontend, docs, or backend, and subsystem is the smaller division within them, for instance auth in backend. Lastly the changes is what the commits actually changed.

Here's a list of possible commit types, but not exhaustive:

- backend: auth: created migrations for token storage
- backend: session: ensures user must exist before joining
- docs: process: add section on code review
- devenv: update to latest scottylabs version
- frontend: motion: center vote div

## Git Policy

Beyond just commit messages, there are several things that can be done to help with git commit history.

### Pulling to a Branch

When you re-pull changes from main, use `rebase` instead of `merge`. This produces cleaner commit history and retains the commit owner, since rebase basically places your commits on top of current main again, meaning commit history and permissions/CODEOWNERS especially are computed correctly.

In contrast, merge commits are owned by the person who merges the PR. For example, this breaks governance's file owner checks by making governance think someone who updated their branch to main via a merge commit was actually touching all of those files that were modified on main. This would cause CODEOWNERS issues, for instance, and prevent tech leads from being able to merge PRs from their own members.

### Merging a PR

Similarly to the above, choose `rebase and fast forward` instead of creating merge commits in any way. This makes it so that commit history is preserved.
