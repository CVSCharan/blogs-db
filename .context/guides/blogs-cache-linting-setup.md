# ESLint & Prettier Setup Guide (blogs-cache)

This guide documents the linting and formatting setup for the `blogs-cache` library.

## 1. Overview

The `blogs-cache` library uses:

- **ESLint**: For code quality and TypeScript best practices
- **Prettier**: For consistent code formatting

## 2. Dependencies

Install these packages in `devDependencies`:

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
  "ignorePatterns": ["dist", "node_modules", "*.js", "*.d.ts", "*.js.map", "*.d.ts.map"]
}
```

### 3.2 `.prettierrc`

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

```
dist
node_modules
coverage
*.log
.env
.env.*
```

### 3.4 `.eslintignore`

```
# Build output
dist
node_modules
coverage

# Generated files
*.d.ts
*.js.map
*.d.ts.map

# Config files
*.config.js
jest.config.js
```

## 4. NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
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
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

## 7. Naming Convention Enforcement

ESLint will automatically enforce:

- ✅ Classes/Enums use `PascalCase`
- ✅ Interfaces use `PascalCase` (no `I` prefix)
- ✅ Variables/Functions use `camelCase`
- ✅ Constants use `camelCase` or `UPPER_CASE`
- ✅ No unused variables (except those prefixed with `_`)
- ✅ Proper async/await usage
- ✅ No floating promises

## 8. Common Issues

### Issue: ESLint can't find modules

**Solution**: Run `npm install` to ensure all dependencies are installed

### Issue: Prettier and ESLint conflict

**Solution**: Ensure `eslint-config-prettier` is the last item in `extends` array

### Issue: Linting is slow

**Solution**: Add more patterns to `.eslintignore`:

```
dist
node_modules
coverage
*.config.js
```

## 9. Best Practices

1. **Run linting before committing**: Use pre-commit hooks
2. **Fix issues immediately**: Don't accumulate linting errors
3. **Use `// eslint-disable-next-line` sparingly**: Only for legitimate exceptions
4. **Keep rules consistent**: Use the same config across all services
5. **Update regularly**: Keep ESLint and Prettier up to date

## 10. Differences from blogs-db

The `blogs-cache` linting setup is simpler because:

- ❌ No Prisma schema files to format
- ❌ No MongoDB schema compilation artifacts
- ✅ Simpler `.eslintignore` patterns
- ✅ Faster linting (fewer files)

## 11. Integration with IDE

### VS Code

Install extensions:

- **ESLint** - `dbaeumer.vscode-eslint`
- **Prettier** - `esbenp.prettier-vscode`

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 12. Troubleshooting

### Issue: TypeScript version warning

**Solution**: This is just a warning. ESLint works fine with TypeScript 5.x

### Issue: `no-console` warnings

**Solution**: Use `console.warn()` or `console.error()` which are allowed, or disable for specific lines:

```typescript
// eslint-disable-next-line no-console
console.log('Debug info');
```

## 13. Next Steps

1. ✅ Copy configuration files to `blogs-cache` repository
2. ✅ Run `npm install` to install dependencies
3. ✅ Run `npm run lint` to verify setup
4. ✅ Set up pre-commit hooks (optional)
5. ✅ Configure IDE integration

---

**Consistent code quality across all Blog Platform services!** 🎯
