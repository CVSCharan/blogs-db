# ESLint & Prettier Setup Guide

This guide documents the linting and formatting setup for Blog Platform projects.

## 1. Overview

All Blog Platform services use:

- **ESLint**: For code quality and naming convention enforcement
- **Prettier**: For consistent code formatting

## 2. Dependencies

Already installed in `blogs-db` via `package.json`:

```json
{
  "devDependencies": {
    "eslint": "^8.57.1",
    "@typescript-eslint/parser": "^6.21.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "prettier": "^3.4.2",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.2.1"
  }
}
```

## 3. Configuration Files

### 3.1 `.eslintrc.json`

Already configured in `blogs-db` with TypeScript best practices:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "env": {
    "node": true,
    "jest": true
  },
  "ignorePatterns": ["dist", "node_modules", "*.js"]
}
```

### 3.2 `.prettierrc`

Already configured:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 3.3 `.prettierignore`

Create this file:

```
dist
node_modules
coverage
*.log
.env
.prisma
```

## 4. NPM Scripts

Already configured in `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"prisma/**/*.prisma\" \"mongodb/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"prisma/**/*.prisma\" \"mongodb/**/*.ts\""
  }
}
```

## 5. CI/CD Integration

Linting and formatting checks are included in `.github/workflows/ci-cd.yml`:

```yaml
- name: Lint code
  run: npm run lint

- name: Check formatting
  run: npm run format:check
```

## 6. Usage

### Local Development

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check if code is formatted
npm run format:check
```

### Pre-commit Hook (Optional)

Install Husky for automatic linting:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.prisma": ["prettier --write"]
  }
}
```

## 7. Naming Convention Enforcement

ESLint will automatically enforce:

- ✅ Classes/Enums use `PascalCase`
- ✅ Interfaces use `PascalCase` (no `I` prefix, no `Interface` suffix)
- ✅ Variables/Functions use `camelCase`
- ✅ Constants use `camelCase` or `UPPER_CASE`
- ✅ Enum members use `PascalCase`
- ✅ No unused variables (except those prefixed with `_`)
- ✅ Proper async/await usage
- ✅ No floating promises

## 8. Replication for Other Services

Copy these files to `blogs-auth`, `blogs-api`, `blogs-notifications`, etc.:

1. `.eslintrc.json`
2. `.prettierrc`
3. `.prettierignore`
4. Update `package.json` scripts (already included in template)
5. Update CI/CD workflow

## 9. Common Issues

### Issue: ESLint can't find `@prisma/client`

**Solution**: Run `npm run prisma:generate` first

### Issue: Prettier and ESLint conflict

**Solution**: Ensure `eslint-config-prettier` is the last item in `extends` array

### Issue: Linting is slow

**Solution**: Add more patterns to `.eslintignore`:

```
dist
node_modules
coverage
.prisma
*.config.js
```

## 10. Best Practices

1. **Run linting before committing**: Use pre-commit hooks
2. **Fix issues immediately**: Don't accumulate linting errors
3. **Use `// eslint-disable-next-line` sparingly**: Only for legitimate exceptions
4. **Keep rules consistent**: Use the same config across all services
5. **Update regularly**: Keep ESLint and Prettier up to date
