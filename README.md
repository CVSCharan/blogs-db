# @blog-platform/db

Shared database library for Blog Platform microservices, providing type-safe access to both PostgreSQL (Prisma) and MongoDB (Mongoose).

## Features

- ✅ **PostgreSQL** - Prisma ORM for relational data (users, posts, comments, media)
- ✅ **MongoDB** - Mongoose ODM for analytics, notifications, and logs
- ✅ **Type Safety** - Full TypeScript support with generated types
- ✅ **Migration Management** - Automated schema migrations
- ✅ **Connection Pooling** - Optimized database connections
- ✅ **Production Ready** - Includes monitoring, error handling, and graceful shutdown

## Installation

```bash
npm install @blog-platform/db
```

## Quick Start

### PostgreSQL (Prisma)

```typescript
import { getPrismaClient, PostStatus } from '@blog-platform/db';

const prisma = getPrismaClient();

// Create a post
const post = await prisma.post.create({
  data: {
    title: 'Hello World',
    slug: 'hello-world',
    content: 'This is my first post!',
    authorId: 'user-123',
    status: PostStatus.PUBLISHED,
  },
});

// Query posts
const posts = await prisma.post.findMany({
  where: {
    status: PostStatus.PUBLISHED,
  },
  include: {
    categories: true,
    tags: true,
  },
});
```

### MongoDB (Mongoose)

```typescript
import { connectMongoDB, PageViewModel } from '@blog-platform/db';

// Connect to MongoDB
await connectMongoDB();

// Track a page view
const pageView = await PageViewModel.create({
  postId: 'post-123',
  postSlug: 'hello-world',
  sessionId: 'session-abc',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  device: {
    type: 'desktop',
    os: 'macOS',
    browser: 'Chrome',
  },
  source: 'google',
});
```

## Environment Variables

Create a `.env` file in your service:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/blogs_db"
MONGODB_URI="mongodb://localhost:27017/blogs_db"
NODE_ENV="development"
```

## Available Models

### PostgreSQL (Prisma)

**Auth Domain:**
- `User` - User accounts
- `Profile` - User profiles
- `Session` - Active sessions

**Content Domain:**
- `Post` - Blog posts
- `Category` - Post categories (hierarchical)
- `Tag` - Post tags
- `Comment` - Post comments (nested)
- `Like` - Post likes
- `Bookmark` - User bookmarks

**Media Domain:**
- `Media` - Uploaded files
- `MediaVariant` - Image variants (thumbnail, medium, large)

### MongoDB (Mongoose)

**Analytics:**
- `PageViewModel` - Page view tracking
- `AnalyticsEventModel` - Custom events
- `UserActivityModel` - User activity timeline

**Notifications:**
- `NotificationModel` - Multi-channel notifications
- `NotificationQueueModel` - Notification queue
- `EmailLogModel` - Email delivery logs
- `PushNotificationLogModel` - Push notification logs

**Logs:**
- `AuditLogModel` - Audit trail (2-year retention)
- `SystemLogModel` - Application logs
- `ErrorLogModel` - Error tracking
- `PerformanceLogModel` - Performance metrics

## Development

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:dev

# Seed database
npm run prisma:seed
```

### Build

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Linting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Migrations

### Creating Migrations

```bash
# Create a new migration
npm run prisma:migrate:dev -- --name add_user_roles

# Deploy migrations (production)
npm run prisma:migrate:deploy
```

### MongoDB Migrations

```bash
# Run MongoDB migrations
npm run mongodb:migrate

# Seed MongoDB
npm run mongodb:seed
```

## Usage in Services

### Installation

```bash
# In your service (e.g., blogs-api)
npm install @blog-platform/db@latest
```

### Example Service Integration

```typescript
// src/infrastructure/database/prisma.service.ts
import { getPrismaClient } from '@blog-platform/db';

export class PrismaService {
  private static instance: PrismaService;
  public client = getPrismaClient();

  private constructor() {}

  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }
}
```

## Type Safety

All Prisma and Mongoose types are exported:

```typescript
import type {
  User,
  Post,
  Comment,
  IPageView,
  INotification,
  IAuditLog,
} from '@blog-platform/db';
```

## Connection Management

### Graceful Shutdown

Both Prisma and Mongoose clients handle graceful shutdown automatically:

```typescript
import { disconnectPrisma, disconnectMongoDB } from '@blog-platform/db';

// In your service shutdown handler
process.on('SIGTERM', async () => {
  await disconnectPrisma();
  await disconnectMongoDB();
  process.exit(0);
});
```

## Performance

- **Connection Pooling**: Prisma uses connection pooling by default
- **MongoDB Pool**: Configured with 10 max connections, 2 min connections
- **Indexes**: All frequently queried fields are indexed
- **TTL Indexes**: MongoDB collections auto-delete old data

## Security

- **Parameterized Queries**: Prisma prevents SQL injection
- **Connection Encryption**: Use SSL/TLS in production
- **Secrets Management**: Store credentials in environment variables
- **Audit Logging**: All critical actions are logged

## Monitoring

### Query Logging

Development mode logs all queries:

```typescript
// Automatic in development
const prisma = getPrismaClient();
// Logs: Query: SELECT * FROM posts WHERE status = 'PUBLISHED'
```

### Health Checks

```typescript
import { getPrismaClient, mongoose } from '@blog-platform/db';

const prisma = getPrismaClient();

// Check PostgreSQL
await prisma.$queryRaw`SELECT 1`;

// Check MongoDB
await mongoose.connection.db.admin().ping();
```

## Versioning

This library follows [Semantic Versioning](https://semver.org/):

- **Major (1.0.0)**: Breaking changes (schema changes that break existing code)
- **Minor (0.1.0)**: New features (new models, non-breaking additions)
- **Patch (0.0.1)**: Bug fixes (documentation, type fixes)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Create a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
