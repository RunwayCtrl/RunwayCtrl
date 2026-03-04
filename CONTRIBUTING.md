# Contributing to RunwayCtrl

Thank you for your interest in contributing to RunwayCtrl. This document provides guidelines and standards for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Architecture Decisions](#architecture-decisions)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

---

## Getting Started

1. **Fork the repo** and clone your fork
2. **Install dependencies:** `pnpm install`
3. **Run tests:** `pnpm test`

See the [README](README.md) for complete setup instructions.

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 20 (LTS)
- **pnpm** (package manager — do not use npm or yarn)
- **Git** with conventional commit awareness

### Environment

No environment variables are required for typical SDK/library development.

The proprietary control plane/runtime is not published in this repository.

For integration testing with real services (Jira, ServiceNow, GitHub), see [TESTING.md](TESTING.md).

---

## Code Standards

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- **No `any`** — use `unknown` and narrow with type guards
- **Explicit return types** on exported functions
- **Zod** for runtime validation of external inputs (API requests, env vars, config)

### File Organization

- Follow the existing folder structure in this repository (apps/packages separation, small modules)
- One concept per file; files should be < 300 lines (split if larger)
- Barrel exports (`index.ts`) per package/module

### Naming Conventions

| Thing            | Convention      | Example                   |
| ---------------- | --------------- | ------------------------- |
| Files            | kebab-case      | `begin-action.service.ts` |
| Classes          | PascalCase      | `ActionRepository`        |
| Functions        | camelCase       | `beginAction()`           |
| Constants        | SCREAMING_SNAKE | `MAX_RETRY_ATTEMPTS`      |
| Types/Interfaces | PascalCase      | `BeginActionRequest`      |
| Env vars         | SCREAMING_SNAKE | `RUNWAYCTRL_EXAMPLE`      |

### Testing

- **Unit tests:** colocated with source (`*.test.ts`)
- **Integration tests:** colocated with source (`*.integration.test.ts`)
- **Test runner:** Vitest
- **Mocking:** external API mocks (planned)
- Every new feature must include tests. PRs without tests will be returned.

### Documentation

- Every behavior change must update the relevant _public_ docs in the same PR (README, changelog as applicable)
- Some design documentation (roadmap/runbooks/internal ADRs) is maintained privately; external contributors should focus PRs on code + tests + API surface
- Inline code comments for non-obvious "why" decisions (not "what" — code should be self-explanatory)

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) and **enforce them in CI**.

Because we **squash-merge** PRs to `main`, the **PR title becomes the commit message** on `main`.
So: make your PR title a valid conventional commit (e.g. `feat(sdk): add typed helpers for action keys`).

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Build process, tooling, dependencies                    |
| `perf`     | Performance improvement                                 |
| `ci`       | CI/CD changes                                           |
| `security` | Security fix or improvement                             |

### Scopes (optional but encouraged)

`sdk`, `shared`, `docs`, `ci`, `tooling`

### Examples

```text
feat(sdk): add typed helper utilities
fix(shared): tighten runtime validation
docs: improve SDK usage examples
test(sdk): add unit tests for key normalization
chore(deps): update vitest to 3.x

# Squash merge commit examples (PR titles)
chore: phase 0.1 monorepo scaffolding
ci: enforce conventional commits
```

---

## Pull Request Process

### Before submitting

1. **Run the full test suite:** `pnpm test`
2. **Run lint and type check:** `pnpm lint && pnpm typecheck`
3. **Update docs** if behavior changed
4. **Add changelog entry** if the change affects the API or SDK behavior

### PR template

PRs should include:

- **What** — brief summary of the change
- **Why** — link to issue or describe motivation
- **How** — implementation approach (especially for non-obvious decisions)
- **Testing** — what was tested and how
- **Checklist:**
  - [ ] Tests pass
  - [ ] Lint passes
  - [ ] Docs updated (if applicable)
  - [ ] Changelog updated (if API/SDK change)
  - [ ] No secrets in code, logs, or comments

### Review expectations

- All PRs require at least one review
- Security-sensitive changes (auth, tenant isolation, crypto) require explicit security review
- Breaking API changes require an ADR

---

## Issue Guidelines

### Bug reports

Include:

- **Environment** (Node version, OS, Docker versions)
- **Steps to reproduce** (exact commands or API calls)
- **Expected vs actual behavior**
- **Relevant logs** (redact secrets)

### Feature requests

Include:

- **Problem statement** (what gap does this address?)
- **Proposed solution** (how should it work?)
- **Alternatives considered**
- **Impact on guarantees** (A through E — does this change affect any guarantee?)

---

## Architecture Decisions

Significant design decisions are tracked internally.

**When to write an ADR:**

- Choosing between technical alternatives with meaningful tradeoffs
- Changing a previously decided approach
- Adding a new integration or storage system
- Modifying guarantee semantics

If you’re proposing a non-trivial change, include rationale and tradeoffs in the PR description.

---

## Questions?

Open an issue with the `question` label, or start a discussion.
