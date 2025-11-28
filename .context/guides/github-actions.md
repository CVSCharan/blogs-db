# GitHub Actions & Package Publishing Guide

This guide explains the CI/CD pipeline used in `blogs-db` and how to replicate it for `blogs-cache` and other services.

## 1. Workflow Overview

The pipeline is defined in `.github/workflows/ci-cd.yml` and consists of two main jobs:

1.  **Build & Test**: Runs on every push to `main` and `develop`.
    - Installs dependencies (`npm ci`).
    - Generates Prisma Client (if applicable).
    - Runs linting (`npm run lint`).
    - Runs type checks (`npm run build`).
    - Runs tests (`npm test`).
2.  **Publish**: Runs **only** when a tag starting with `v` (e.g., `v1.0.0`) is pushed.
    - Publishes the package to **GitHub Packages** registry.

## 2. Configuration Requirements

To enable this workflow for `blogs-cache` (or any new repo), ensure the following files are configured correctly.

### 2.1 `package.json`

Ensure the `publishConfig` points to the GitHub registry.

```json
{
  "name": "@cvscharan/blogs-db",
  "version": "1.0.0",
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com/"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/CVSCharan/blogs-db.git"
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

- **Why not `GITHUB_TOKEN`?** The default token often lacks permissions to read/write packages across different repositories in an organization context, or to trigger downstream workflows.
- **Setup**:
  1.  Go to Repository Settings -> Secrets and variables -> Actions.
  2.  Add `GH_PAT` with a token that has `write:packages` and `read:packages` scopes.

## 3. The Workflow File (`.github/workflows/ci-cd.yml`)

Copy this file to `blogs-cache/.github/workflows/ci-cd.yml`.

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

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: blogs_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # For services using Prisma
      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Lint code
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/blogs_test
          MONGODB_URI: mongodb://localhost:27017/blogs_test

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
          scope: '@blog-platform'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Build
        run: npm run build

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GH_PAT }}
```

## 4. How to Publish a New Version

1.  **Update Version**: Bump the version in `package.json` (e.g., `1.0.0` -> `1.0.1`).
2.  **Update CHANGELOG**: Document changes in `CHANGELOG.md`.
3.  **Commit**: `git commit -am "chore: bump version to 1.0.1"`
4.  **Tag**: `git tag v1.0.1`
5.  **Push**: `git push origin main --tags`

The GitHub Action will detect the tag `v1.0.1` and automatically run the `publish-github` job.

## 5. Consuming Published Packages

### 5.1 Create `.npmrc` in consuming service

```ini
@blog-platform:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GH_PAT}
```

### 5.2 Install package

```bash
npm install @blog-platform/db@latest
```

## 6. Troubleshooting

**Issue**: `npm publish` fails with 403

- **Solution**: Ensure `GH_PAT` secret has `write:packages` permission

**Issue**: Cannot install package in other services

- **Solution**: Ensure `.npmrc` is configured and `GH_PAT` is set in environment

**Issue**: Tests fail in CI but pass locally

- **Solution**: Check environment variables and database connections
