# blogs-db Implementation Plan

## 1. Executive Summary

The `blogs-db` repository is a **shared database library** that provides:

- **PostgreSQL schema** and Prisma client for relational data
- **MongoDB schema** definitions and Mongoose models for analytics/logs
- **Type-safe database access** for all microservices
- **Migration management** for schema evolution
- **Seed data** for development and testing

This library follows **SOLID principles** and **production-ready best practices** to ensure consistency, type safety, and maintainability across all services.

---

## 2. Repository Purpose & Scope

### 2.1 What This Repository IS

✅ **Schema Definition Layer**

- Single source of truth for database schemas
- Prisma schema for PostgreSQL
- Mongoose schemas for MongoDB
- TypeScript types generated from schemas

✅ **Database Client Library**

- Pre-configured Prisma client
- Pre-configured Mongoose connection
- Connection pooling and optimization
- Type-safe query builders

✅ **Migration Management**

- Prisma migrations for PostgreSQL
- MongoDB migration scripts
- Seed data for development
- Test data fixtures

### 2.2 What This Repository IS NOT

❌ **Not a Service**

- No API endpoints
- No business logic
- No application-specific code

❌ **Not a Data Access Layer**

- No repositories (those live in services)
- No query logic (services handle that)
- No caching logic (handled by `blogs-cache`)

---

## 3. Architecture Principles

### 3.1 SOLID Principles Applied

**Single Responsibility Principle (SRP)**

- This library has ONE job: provide database schemas and clients
- No business logic, no API logic, no presentation logic

**Open/Closed Principle (OCP)**

- Schema is open for extension (new models can be added)
- Closed for modification (existing models maintain backward compatibility)
- Versioned releases for breaking changes

**Liskov Substitution Principle (LSP)**

- Generated types are consistent across versions
- Services can upgrade without breaking changes (semantic versioning)

**Interface Segregation Principle (ISP)**

- Services import only what they need
- Separate exports for PostgreSQL and MongoDB
- Tree-shakeable exports

**Dependency Inversion Principle (DIP)**

- Services depend on abstractions (Prisma/Mongoose types)
- Not on concrete implementations
- Easy to mock for testing

### 3.2 Design Patterns

**Repository Pattern (Enabled)**

- This library provides the foundation
- Services implement repositories using these types

**Factory Pattern**

- Database client factory for different environments
- Connection configuration factory

**Singleton Pattern**

- Single Prisma client instance per service
- Single Mongoose connection per service

---

## 4. Project Structure

```
blogs-db/
├── .context/                      # Documentation
│   └── project-wide/
│       ├── blogs-architecture.md
│       ├── database-schema.md
│       ├── polyglot-persistence-strategy.md
│       └── blogs-db-implementation-plan.md
│
├── prisma/                        # PostgreSQL (Prisma)
│   ├── schema.prisma             # Main schema definition
│   ├── migrations/               # Migration history
│   │   ├── 20250101000000_init/
│   │   ├── 20250102000000_add_posts/
│   │   └── migration_lock.toml
│   └── seed.ts                   # Seed data script
│
├── mongodb/                       # MongoDB (Mongoose)
│   ├── schemas/                  # Mongoose schemas
│   │   ├── analytics/
│   │   │   ├── page-view.schema.ts
│   │   │   ├── analytics-event.schema.ts
│   │   │   ├── user-activity.schema.ts
│   │   │   └── search-query.schema.ts
│   │   ├── notifications/
│   │   │   ├── notification.schema.ts
│   │   │   ├── notification-queue.schema.ts
│   │   │   ├── email-log.schema.ts
│   │   │   └── push-notification-log.schema.ts
│   │   └── logs/
│   │       ├── audit-log.schema.ts
│   │       ├── system-log.schema.ts
│   │       ├── error-log.schema.ts
│   │       └── performance-log.schema.ts
│   ├── migrations/               # MongoDB migrations
│   │   ├── 001_create_indexes.ts
│   │   └── 002_add_ttl_indexes.ts
│   └── seed.ts                   # MongoDB seed data
│
├── src/                          # Source code
│   ├── prisma/                   # PostgreSQL client
│   │   ├── client.ts             # Prisma client singleton
│   │   ├── types.ts              # Re-export Prisma types
│   │   └── index.ts              # Barrel export
│   │
│   ├── mongodb/                  # MongoDB client
│   │   ├── client.ts             # Mongoose connection
│   │   ├── models.ts             # Export all models
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── index.ts              # Barrel export
│   │
│   ├── config/                   # Configuration
│   │   ├── database.config.ts    # Database URLs, pool sizes
│   │   └── index.ts
│   │
│   └── index.ts                  # Main entry point
│
├── tests/                        # Tests
│   ├── prisma/
│   │   ├── client.test.ts
│   │   └── migrations.test.ts
│   └── mongodb/
│       ├── client.test.ts
│       └── schemas.test.ts
│
├── scripts/                      # Utility scripts
│   ├── generate-types.ts         # Generate TypeScript types
│   ├── migrate-dev.ts            # Run migrations (dev)
│   ├── migrate-prod.ts           # Run migrations (prod)
│   ├── seed-dev.ts               # Seed development data
│   └── verify-schemas.ts         # Validate schemas
│
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI pipeline
│       ├── publish.yml           # Publish to npm/GitHub Packages
│       └── security.yml          # Security scanning
│
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── .npmignore
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## 5. Implementation Details

### 5.1 PostgreSQL Schema (Prisma)

**File: `prisma/schema.prisma`**

```prisma
// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTH DOMAIN
// ============================================

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String?

  role          UserRole  @default(READER)
  isVerified    Boolean   @default(false)

  profile       Profile?
  sessions      Session[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
  @@schema("auth")
}

enum UserRole {
  READER
  AUTHOR
  EDITOR
  ADMIN

  @@schema("auth")
}

model Profile {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstName         String?
  lastName          String?
  displayName       String?
  bio               String?   @db.Text
  avatar            String?
  website           String?

  twitter           String?
  linkedin          String?
  github            String?

  isAuthorVerified  Boolean   @default(false)
  authorBadge       String?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@map("profiles")
  @@schema("auth")
}

model Session {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  token         String    @unique
  expiresAt     DateTime

  createdAt     DateTime  @default(now())

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
  @@schema("auth")
}

// ============================================
// CONTENT DOMAIN
// ============================================

model Post {
  id              String      @id @default(uuid())
  authorId        String

  title           String
  slug            String      @unique
  excerpt         String?     @db.Text
  content         String      @db.Text
  coverImage      String?

  status          PostStatus  @default(DRAFT)
  visibility      PostVisibility @default(PUBLIC)

  metaTitle       String?
  metaDescription String?     @db.Text
  keywords        String[]

  viewCount       Int         @default(0)
  likeCount       Int         @default(0)
  commentCount    Int         @default(0)
  readTime        Int?

  publishedAt     DateTime?
  scheduledAt     DateTime?

  categories      PostCategory[]
  tags            PostTag[]
  comments        Comment[]
  likes           Like[]
  bookmarks       Bookmark[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([authorId])
  @@index([status])
  @@index([publishedAt])
  @@index([slug])
  @@map("posts")
  @@schema("content")
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED

  @@schema("content")
}

enum PostVisibility {
  PUBLIC
  UNLISTED
  PRIVATE

  @@schema("content")
}

// ... (Continue with all other models from database-schema.md)

// ============================================
// MEDIA DOMAIN
// ============================================

model Media {
  id              String      @id @default(uuid())
  userId          String

  filename        String
  originalName    String
  mimeType        String
  size            Int

  storageProvider String
  storageKey      String
  url             String

  variants        MediaVariant[]

  width           Int?
  height          Int?
  duration        Int?

  status          MediaStatus @default(PROCESSING)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId])
  @@map("media")
  @@schema("media")
}

enum MediaStatus {
  PROCESSING
  READY
  FAILED

  @@schema("media")
}

// ... (Continue with MediaVariant and other models)
```

### 5.2 Prisma Client Singleton

**File: `src/prisma/client.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import { logger } from "../common/logger";

// Singleton pattern for Prisma client
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "event" },
        { level: "warn", emit: "event" },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === "development") {
      prisma.$on("query", (e) => {
        logger.debug("Prisma Query", {
          query: e.query,
          params: e.params,
          duration: e.duration,
        });
      });
    }

    // Log errors
    prisma.$on("error", (e) => {
      logger.error("Prisma Error", { error: e });
    });

    // Graceful shutdown
    process.on("beforeExit", async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export { PrismaClient };
```

### 5.3 MongoDB Schemas (Mongoose)

**File: `mongodb/schemas/analytics/page-view.schema.ts`**

```typescript
import { Schema, model, Document } from "mongoose";

export interface IPageView extends Document {
  postId: string;
  postSlug: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  device: {
    type: "mobile" | "tablet" | "desktop";
    os: string;
    browser: string;
  };
  timeSpent?: number;
  scrollDepth?: number;
  interacted: boolean;
  referrer?: string;
  source: string;
  campaign?: string;
  medium?: string;
  geo?: {
    country: string;
    city: string;
    timezone: string;
  };
  timestamp: Date;
  exitedAt?: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    postId: { type: String, required: true, index: true },
    postSlug: { type: String, required: true },
    userId: { type: String, index: true },
    sessionId: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    device: {
      type: {
        type: String,
        enum: ["mobile", "tablet", "desktop"],
        required: true,
      },
      os: { type: String, required: true },
      browser: { type: String, required: true },
    },
    timeSpent: { type: Number },
    scrollDepth: { type: Number },
    interacted: { type: Boolean, default: false },
    referrer: { type: String },
    source: { type: String, required: true },
    campaign: { type: String },
    medium: { type: String },
    geo: {
      country: { type: String },
      city: { type: String },
      timezone: { type: String },
    },
    timestamp: { type: Date, default: Date.now, index: true },
    exitedAt: { type: Date },
  },
  {
    timestamps: false,
    collection: "pageViews",
  }
);

// Compound indexes
PageViewSchema.index({ postId: 1, timestamp: -1 });
PageViewSchema.index({ userId: 1, timestamp: -1 });
PageViewSchema.index({ "device.type": 1 });

// TTL index - auto-delete after 90 days
PageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const PageViewModel = model<IPageView>("PageView", PageViewSchema);
```

### 5.4 MongoDB Client

**File: `src/mongodb/client.ts`**

```typescript
import mongoose from "mongoose";
import { logger } from "../common/logger";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    logger.info("MongoDB already connected");
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info("MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB connection error", { error });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      isConnected = false;
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error });
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB disconnected");
  }
}

export { mongoose };
```

### 5.5 Main Entry Point

**File: `src/index.ts`**

```typescript
// PostgreSQL (Prisma)
export {
  getPrismaClient,
  disconnectPrisma,
  PrismaClient,
} from "./prisma/client";
export * from "@prisma/client"; // Re-export all Prisma types

// MongoDB (Mongoose)
export { connectMongoDB, disconnectMongoDB, mongoose } from "./mongodb/client";
export * from "./mongodb/models"; // All Mongoose models
export * from "./mongodb/types"; // All TypeScript interfaces

// Configuration
export * from "./config";
```

---

## 6. Package Configuration

### 6.1 package.json

```json
{
  "name": "@blog-platform/db",
  "version": "1.0.0",
  "description": "Shared database library for Blog Platform microservices",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "prisma/schema.prisma", "mongodb/schemas"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist node_modules/.prisma",

    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts",

    "mongodb:migrate": "ts-node mongodb/migrations/run.ts",
    "mongodb:seed": "ts-node mongodb/seed.ts",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",

    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",

    "prepublishOnly": "npm run build && npm run prisma:generate",
    "postinstall": "npm run prisma:generate"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "mongoose": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "prisma": "^5.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/blogs-db.git"
  },
  "keywords": [
    "database",
    "prisma",
    "mongoose",
    "postgresql",
    "mongodb",
    "blog-platform"
  ],
  "author": "Your Name",
  "license": "MIT"
}
```

---

## 7. CI/CD Pipeline

### 7.1 GitHub Actions - CI

**File: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run format -- --check

  test:
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
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run prisma:generate
      - run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/blogs_test
          MONGODB_URI: mongodb://localhost:27017/blogs_test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
```

### 7.2 GitHub Actions - Publish

**File: `.github/workflows/publish.yml`**

```yaml
name: Publish Package

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          registry-url: "https://npm.pkg.github.com"
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File: `tests/prisma/client.test.ts`**

```typescript
import { getPrismaClient, disconnectPrisma } from "../../src/prisma/client";

describe("Prisma Client", () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it("should return a singleton instance", () => {
    const client1 = getPrismaClient();
    const client2 = getPrismaClient();
    expect(client1).toBe(client2);
  });

  it("should connect to database", async () => {
    const client = getPrismaClient();
    await expect(client.$connect()).resolves.not.toThrow();
  });
});
```

### 8.2 Integration Tests

**File: `tests/prisma/migrations.test.ts`**

```typescript
import { getPrismaClient } from "../../src/prisma/client";

describe("Database Migrations", () => {
  const prisma = getPrismaClient();

  it("should have all required tables", async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    expect(tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table_name: "users" }),
        expect.objectContaining({ table_name: "posts" }),
        expect.objectContaining({ table_name: "comments" }),
      ])
    );
  });
});
```

---

## 9. Migration Strategy

### 9.1 Development Workflow

```bash
# 1. Make schema changes in prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate:dev -- --name add_user_roles

# 3. Review migration SQL
# 4. Test migration
npm run test

# 5. Commit migration files
git add prisma/migrations
git commit -m "feat: add user roles"
```

### 9.2 Production Deployment

```bash
# 1. Deploy migration (no prompts)
npm run prisma:migrate:deploy

# 2. Verify deployment
npm run prisma:studio
```

---

## 10. Versioning & Publishing

### 10.1 Semantic Versioning

- **Major (1.0.0)**: Breaking changes (schema changes that break existing code)
- **Minor (0.1.0)**: New features (new models, non-breaking additions)
- **Patch (0.0.1)**: Bug fixes (documentation, type fixes)

### 10.2 Publishing Workflow

```bash
# 1. Update version
npm version minor

# 2. Update CHANGELOG.md
# 3. Create Git tag
git tag v1.1.0

# 4. Push to GitHub
git push origin main --tags

# 5. Create GitHub Release (triggers publish workflow)
```

---

## 11. Consuming Services Integration

### 11.1 Installation in Services

```bash
# In blogs-auth, blogs-api, etc.
npm install @blog-platform/db@latest
```

### 11.2 Usage Example

```typescript
// In blogs-api service
import { getPrismaClient, PostStatus } from "@blog-platform/db";

const prisma = getPrismaClient();

async function getPublishedPosts() {
  return await prisma.post.findMany({
    where: {
      status: PostStatus.PUBLISHED,
      visibility: "PUBLIC",
    },
    include: {
      categories: true,
      tags: true,
    },
  });
}
```

---

## 12. Production Readiness Checklist

### Pre-Release Checklist

- [ ] All schemas documented
- [ ] Migrations tested in staging
- [ ] Indexes optimized
- [ ] Connection pooling configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Tests passing (100% coverage for critical paths)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] GitHub release created

### Post-Release Checklist

- [ ] All services updated to latest version
- [ ] Migrations deployed to production
- [ ] Monitoring alerts configured
- [ ] Backup verification completed
- [ ] Rollback plan documented

---

## 13. Maintenance & Operations

### 13.1 Regular Tasks

**Weekly**

- Review and update dependencies
- Check for security vulnerabilities
- Review slow queries

**Monthly**

- Performance optimization review
- Index usage analysis
- Database size monitoring

**Quarterly**

- Major version updates
- Schema optimization
- Archive old data

### 13.2 Monitoring

**Metrics to Track**

- Query performance (slow queries)
- Connection pool utilization
- Migration success rate
- Package download count
- Breaking change incidents

---

This implementation plan provides a complete blueprint for building a production-ready, SOLID-compliant shared database library for the Blog Platform.
