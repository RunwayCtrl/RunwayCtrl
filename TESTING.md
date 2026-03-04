# Testing Guide

> RunwayCtrl test strategy, conventions, and integration test instance setup.

---

## Table of Contents

- [Test Pyramid](#test-pyramid)
- [Running Tests](#running-tests)
- [Test Naming Conventions](#test-naming-conventions)
- [Mock-First Local Development](#mock-first-local-development)
- [Integration Test Instances](#integration-test-instances)
- [CI Integration Tests](#ci-integration-tests)
- [Concurrency & Stress Tests](#concurrency--stress-tests)

---

## Test Pyramid

| Layer       | Tool   | Scope                                          | Run in CI   |
| ----------- | ------ | ---------------------------------------------- | ----------- |
| Unit        | Vitest | Pure functions, state machines, business logic | ✅ Always   |
| Integration | Vitest | SDK-adjacent integration tests (as added)      | ✅ As added |

---

## Running Tests

```bash
# All tests (unit + integration)
# Note: during Phase 0, the integration suite may be empty; it is still wired.
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests (as added)
# Note: this currently passes even if there are no integration tests yet.
pnpm test:integration

# Watch mode during development
pnpm test:watch

# Coverage report
pnpm test:coverage
```

---

## Test Naming Conventions

```text
describe('<ModuleName>')
  describe('<methodName>')
    it('should <expected behavior> when <condition>')
```

**File naming:** `<module>.test.ts` for unit, `<module>.integration.test.ts` for API tests.

**Example:**

```typescript
describe('Governor');
describe('evaluateRetry');
it('should return DENY when max_retries exceeded');
it('should return BACKOFF when rate limit at 85% threshold');
it('should return ALLOW when all invariants pass');
```

---

## Mock-First Local Development

Planned: external API calls will be mocked using [MSW (Mock Service Worker)](https://mswjs.io/) in Node mode.

MSW is **not** installed/configured yet in this Phase 0 repo. When we reach Phase 9 (real Jira/ServiceNow/GitHub integration work), we’ll add MSW and enable mock-first local development.

```typescript
// test/mocks/handlers/jira.ts
import { http, HttpResponse } from 'msw';

export const jiraHandlers = [
  http.post('https://test.atlassian.net/rest/api/3/issue', () => {
    return HttpResponse.json({
      id: '10001',
      key: 'RCTEST-1',
      self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    });
  }),
];
```

MSW handlers live in `test/mocks/handlers/` with one file per integration:

- `jira.ts` — Jira Cloud REST API v3 mocks
- `servicenow.ts` — ServiceNow Table API mocks
- `github.ts` — GitHub REST API mocks

---

## Integration Test Instances

This public repository focuses on SDK/library contributions.

Runtime-level integration testing (control plane, databases, hosted environments, and production integrations) is handled privately during development.

---

## CI Integration Tests

Planned: run integration tests in a separate CI job (after unit/lint/typecheck jobs pass).

Until the first real integration test suite exists, `pnpm test:integration` is configured to pass when no tests are found.

CI secrets for runtime-level integration tests are managed privately.

---

## Concurrency & Stress Tests

Concurrency and stress testing for the full system (including the control plane/runtime) is handled privately during development.
