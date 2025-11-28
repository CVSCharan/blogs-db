# GitHub Actions & Package Publishing Guide (blogs-cache)

This guide explains the CI/CD pipeline for `blogs-cache` and how to publish it to GitHub Packages.

## 1. Workflow Overview

The pipeline is defined in `.github/workflows/ci-cd.yml` and consists of two main jobs:

1. **Build & Test**: Runs on every push to `main` and `develop`.
   - Installs dependencies (`npm ci`)
   - Runs linting (`npm run lint`)
   - Runs type checks (`npm run build`)
   - Runs tests (`npm test`)

2. **Publish**: Runs **only** when a tag starting with `v` (e.g., `v1.0.0`) is pushed.
   - Publishes the package to **GitHub Packages** registry

## 2. Configuration Requirements

### 2.1 `package.json`

Ensure the `publishConfig` points to the GitHub registry.

```json
{
  "name": "@cvscharan/blogs-cache",
  "version": "1.0.0",
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com/"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/CVSCharan/blogs-cache.git"
  }
}
```

### 2.2 `.npmrc`

This file tells local npm to look at GitHub for `@cvscharan` packages.

```ini
@cvscharan:registry=https://npm.pkg.github.com/
```

### 2.3 Secrets (`GH_PAT`)

The workflow uses a secret named `GH_PAT` (Personal Access Token) to authenticate with the registry.

- **Why not `GITHUB_TOKEN`?** The default token often lacks permissions to read/write packages across different repositories.
- **Setup**:
  1. Go to Repository Settings → Secrets and variables → Actions
  2. Add `GH_PAT` with a token that has `write:packages` and `read:packages` scopes

## 3. The Workflow File (`.github/workflows/ci-cd.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags:
      - 'v*' # Trigger on version tags
  pull_request:
    branches: [main, develop]

jobs:
  # ------------------------------------------------------------------
  # BUILD & TEST
  # ------------------------------------------------------------------
  build:
    name: Build & Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

  # ------------------------------------------------------------------
  # PUBLISH (Tags Only)
  # ------------------------------------------------------------------
  publish-github:
    name: Publish to GitHub Packages
    runs-on: ubuntu-latest
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@cvscharan'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GH_PAT }}
```

## 4. How to Publish a New Version

1. **Update Version**: Bump the version in `package.json` (e.g., `1.0.0` -> `1.0.1`)
2. **Update CHANGELOG**: Document changes in `CHANGELOG.md`
3. **Commit**: `git commit -am "chore: bump version to 1.0.1"`
4. **Tag**: `git tag v1.0.1`
5. **Push**: `git push origin main --tags`

The GitHub Action will detect the tag `v1.0.1` and automatically run the `publish-github` job.

## 5. Consuming Published Packages

### 5.1 Create `.npmrc` in consuming service

```ini
@cvscharan:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GH_PAT}
```

### 5.2 Install package

```bash
npm install @cvscharan/blogs-cache@latest
```

## 6. Differences from blogs-db

Unlike `blogs-db`, `blogs-cache` does NOT require:

- ❌ PostgreSQL service container
- ❌ MongoDB service container
- ❌ Prisma client generation

The workflow is simpler because Redis connection is mocked in tests.

## 7. Testing with Redis

### Option 1: Mock Redis (Recommended for CI)

```typescript
// tests/setup.ts
jest.mock('ioredis', () => require('ioredis-mock'));
```

### Option 2: Use Redis Service Container

If you want to test with real Redis:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

## 8. Troubleshooting

**Issue**: `npm publish` fails with 403

- **Solution**: Ensure `GH_PAT` secret has `write:packages` permission

**Issue**: Cannot install package in other services

- **Solution**: Ensure `.npmrc` is configured and `GH_PAT` is set in environment

**Issue**: Tests fail in CI but pass locally

- **Solution**: Ensure Redis is properly mocked or service container is configured

## 9. Best Practices

1. ✅ **Always test before publishing** - Run `npm test` locally
2. ✅ **Use semantic versioning** - Follow semver for version numbers
3. ✅ **Update CHANGELOG** - Document all changes
4. ✅ **Tag releases properly** - Use `v` prefix (v1.0.0, not 1.0.0)
5. ✅ **Keep package-lock.json** - Commit it for consistent installs

## 10. Next Steps

1. ✅ Set up GitHub repository: `https://github.com/CVSCharan/blogs-cache`
2. ✅ Add `GH_PAT` secret to repository
3. ✅ Create initial release with tag `v1.0.0`
4. ✅ Install in blogs-auth and blogs-api services

---

**Package will be available at**: `https://github.com/CVSCharan?tab=packages`
