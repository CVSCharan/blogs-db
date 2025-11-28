# Consuming blogs-db Package Guide

This guide explains how to install and use the `@cvscharan/blogs-db` package in your microservices (blogs-auth, blogs-api, blogs-notifications, etc.).

---

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Usage Examples](#usage-examples)
4. [Service-Specific Integration](#service-specific-integration)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## 1. Installation

### Step 1: Configure npm Registry

Create or update `.npmrc` in your service root:

```ini
@cvscharan:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GH_PAT}
```

### Step 2: Set GitHub Token

**For local development:**

```bash
export GH_PAT=your_github_personal_access_token
```

**For production/CI:**

Add `GH_PAT` to your environment variables or secrets.

### Step 3: Install Package

```bash
npm install @cvscharan/blogs-db@latest
```

---

## 2. Configuration

### Environment Variables

Create `.env` file in your service:

```bash
# PostgreSQL (Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/blogs_db"

# MongoDB (Mongoose)
MONGODB_URI="mongodb://localhost:27017/blogs_db"

# Environment
NODE_ENV="development"
```

### Production URLs

**PostgreSQL (Neon, Supabase, etc.):**

```bash
DATABASE_URL="postgresql://user:password@host.region.provider.com:5432/blogs_db?sslmode=require"
```

**MongoDB (Atlas, MongoDB Cloud):**

```bash
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/blogs_db?retryWrites=true&w=majority"
```

---

## 3. Usage Examples

### 3.1 PostgreSQL (Prisma) Usage

#### Basic CRUD Operations

```typescript
import { getPrismaClient, PostStatus, UserRole } from '@cvscharan/blogs-db';

const prisma = getPrismaClient();

// Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    username: 'johndoe',
    passwordHash: hashedPassword,
    role: UserRole.AUTHOR,
    profile: {
      create: {
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
      },
    },
  },
  include: {
    profile: true,
  },
});

// Find user by email
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { profile: true },
});

// Create a blog post
const post = await prisma.post.create({
  data: {
    title: 'My First Post',
    slug: 'my-first-post',
    content: 'Post content here...',
    excerpt: 'Short description',
    authorId: user.id,
    status: PostStatus.PUBLISHED,
    publishedAt: new Date(),
  },
});

// Query posts with relations
const posts = await prisma.post.findMany({
  where: {
    status: PostStatus.PUBLISHED,
    visibility: 'PUBLIC',
  },
  include: {
    categories: {
      include: {
        category: true,
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
  },
  orderBy: {
    publishedAt: 'desc',
  },
  take: 10,
});

// Update post
await prisma.post.update({
  where: { id: postId },
  data: {
    viewCount: {
      increment: 1,
    },
  },
});

// Delete with cascade
await prisma.user.delete({
  where: { id: userId },
  // Profile, sessions, etc. are automatically deleted
});
```

#### Advanced Queries

```typescript
// Search posts
const searchResults = await prisma.post.findMany({
  where: {
    OR: [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
    ],
    status: PostStatus.PUBLISHED,
  },
});

// Aggregate queries
const stats = await prisma.post.aggregate({
  where: { authorId: userId },
  _count: true,
  _sum: {
    viewCount: true,
    likeCount: true,
  },
});

// Group by
const postsByCategory = await prisma.postCategory.groupBy({
  by: ['categoryId'],
  _count: true,
  orderBy: {
    _count: {
      categoryId: 'desc',
    },
  },
});
```

### 3.2 MongoDB (Mongoose) Usage

#### Connect to MongoDB

```typescript
import { connectMongoDB, disconnectMongoDB } from '@cvscharan/blogs-db';

// Connect on app startup
await connectMongoDB();

// Disconnect on shutdown
process.on('SIGTERM', async () => {
  await disconnectMongoDB();
  process.exit(0);
});
```

#### Track Page Views

```typescript
import { PageViewModel } from '@cvscharan/blogs-db';

// Create page view
await PageViewModel.create({
  postId: 'post-123',
  postSlug: 'my-first-post',
  userId: 'user-456', // optional
  sessionId: 'session-abc',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  device: {
    type: 'desktop',
    os: 'macOS',
    browser: 'Chrome',
  },
  source: 'google',
  referrer: req.headers.referer,
  timestamp: new Date(),
});

// Query page views
const views = await PageViewModel.find({
  postId: 'post-123',
  timestamp: {
    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  },
}).countDocuments();
```

#### Send Notifications

```typescript
import { NotificationModel } from '@cvscharan/blogs-db';

// Create notification
await NotificationModel.create({
  userId: 'user-123',
  type: 'NEW_COMMENT',
  title: 'New comment on your post',
  message: 'John Doe commented on "My First Post"',
  actionUrl: '/posts/my-first-post#comments',
  actionText: 'View Comment',
  relatedEntity: {
    id: 'comment-456',
    type: 'comment',
  },
  actorId: 'user-789',
  actorName: 'John Doe',
  channels: {
    inApp: { enabled: true, read: false },
    email: { enabled: true, sent: false },
    push: { enabled: false, sent: false },
  },
  priority: 'medium',
  createdAt: new Date(),
});

// Get unread notifications
const unread = await NotificationModel.find({
  userId: 'user-123',
  'channels.inApp.read': false,
})
  .sort({ createdAt: -1 })
  .limit(20);

// Mark as read
await NotificationModel.updateOne(
  { _id: notificationId },
  {
    $set: {
      'channels.inApp.read': true,
      'channels.inApp.readAt': new Date(),
    },
  }
);
```

#### Audit Logging

```typescript
import { AuditLogModel } from '@cvscharan/blogs-db';

// Log user action
await AuditLogModel.create({
  userId: req.user.id,
  userEmail: req.user.email,
  userRole: req.user.role,
  action: 'UPDATE_POST',
  resource: 'post',
  resourceId: postId,
  changes: {
    before: { title: 'Old Title' },
    after: { title: 'New Title' },
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  method: req.method,
  endpoint: req.path,
  status: 'success',
  timestamp: new Date(),
});

// Query audit logs
const logs = await AuditLogModel.find({
  userId: 'user-123',
  timestamp: {
    $gte: startDate,
    $lte: endDate,
  },
})
  .sort({ timestamp: -1 })
  .limit(100);
```

---

## 4. Service-Specific Integration

### 4.1 blogs-auth Service

**Purpose**: User authentication and session management

```typescript
// src/infrastructure/database/prisma.service.ts
import { getPrismaClient, disconnectPrisma } from '@cvscharan/blogs-db';

export class DatabaseService {
  public prisma = getPrismaClient();

  async disconnect() {
    await disconnectPrisma();
  }
}

// src/repositories/user.repository.ts
import { UserRole } from '@cvscharan/blogs-db';
import { DatabaseService } from '../infrastructure/database/prisma.service';

export class UserRepository {
  constructor(private db: DatabaseService) {}

  async createUser(data: CreateUserDto) {
    return await this.db.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        role: UserRole.READER,
        profile: {
          create: {
            displayName: data.displayName,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.db.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async createSession(userId: string, token: string, expiresAt: Date) {
    return await this.db.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findSessionByToken(token: string) {
    return await this.db.prisma.session.findUnique({
      where: { token },
      include: { user: { include: { profile: true } } },
    });
  }
}
```

### 4.2 blogs-api Service

**Purpose**: Blog post management and content delivery

```typescript
// src/infrastructure/database/database.module.ts
import {
  getPrismaClient,
  connectMongoDB,
  disconnectPrisma,
  disconnectMongoDB,
} from '@cvscharan/blogs-db';

export class DatabaseModule {
  public prisma = getPrismaClient();

  async initialize() {
    await connectMongoDB();
  }

  async shutdown() {
    await disconnectPrisma();
    await disconnectMongoDB();
  }
}

// src/repositories/post.repository.ts
import { PostStatus, PostVisibility } from '@cvscharan/blogs-db';
import { DatabaseModule } from '../infrastructure/database/database.module';

export class PostRepository {
  constructor(private db: DatabaseModule) {}

  async getPublishedPosts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.db.prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
        },
        include: {
          categories: {
            include: { category: true },
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.prisma.post.count({
        where: {
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
        },
      }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostBySlug(slug: string) {
    return await this.db.prisma.post.findUnique({
      where: { slug },
      include: {
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
        comments: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async incrementViewCount(postId: string) {
    return await this.db.prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }
}

// src/services/analytics.service.ts
import { PageViewModel } from '@cvscharan/blogs-db';

export class AnalyticsService {
  async trackPageView(data: PageViewData) {
    await PageViewModel.create({
      postId: data.postId,
      postSlug: data.postSlug,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      device: data.device,
      source: data.source,
      timestamp: new Date(),
    });
  }

  async getPostViews(postId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await PageViewModel.countDocuments({
      postId,
      timestamp: { $gte: startDate },
    });
  }
}
```

### 4.3 blogs-notifications Service

**Purpose**: Notification management and delivery

```typescript
// src/repositories/notification.repository.ts
import { NotificationModel } from '@cvscharan/blogs-db';

export class NotificationRepository {
  async createNotification(data: CreateNotificationDto) {
    return await NotificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      channels: {
        inApp: { enabled: true, read: false },
        email: { enabled: data.sendEmail, sent: false },
        push: { enabled: data.sendPush, sent: false },
      },
      priority: data.priority || 'medium',
      createdAt: new Date(),
    });
  }

  async getUserNotifications(userId: string, limit: number = 20) {
    return await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async markAsRead(notificationId: string) {
    return await NotificationModel.updateOne(
      { _id: notificationId },
      {
        $set: {
          'channels.inApp.read': true,
          'channels.inApp.readAt': new Date(),
        },
      }
    );
  }

  async getUnreadCount(userId: string) {
    return await NotificationModel.countDocuments({
      userId,
      'channels.inApp.read': false,
    });
  }
}
```

---

## 5. Best Practices

### 5.1 Connection Management

**✅ DO:**

```typescript
// Initialize connections on app startup
async function bootstrap() {
  const prisma = getPrismaClient();
  await connectMongoDB();

  // Start your app
  app.listen(3000);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await disconnectPrisma();
  await disconnectMongoDB();
  process.exit(0);
});
```

**❌ DON'T:**

```typescript
// Don't create new clients repeatedly
function badExample() {
  const prisma = getPrismaClient(); // ❌ Don't call in every function
  // ...
}
```

### 5.2 Error Handling

```typescript
try {
  const user = await prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new ConflictException('Email already exists');
  }
  throw error;
}
```

### 5.3 Transactions

```typescript
// Use transactions for related operations
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({
    data: { ...profileData, userId: user.id },
  });
  return { user, profile };
});
```

### 5.4 Type Safety

```typescript
import type { User, Post, Prisma } from '@cvscharan/blogs-db';

// Use generated types
type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

function processUser(user: UserWithProfile) {
  // TypeScript knows user.profile exists
  console.log(user.profile.displayName);
}
```

---

## 6. Troubleshooting

### Issue: Cannot find module '@cvscharan/blogs-db'

**Solution:**

1. Ensure `.npmrc` is configured correctly
2. Verify `GH_PAT` environment variable is set
3. Run `npm install @cvscharan/blogs-db@latest`

### Issue: Prisma Client not generated

**Solution:**

```bash
cd node_modules/@cvscharan/blogs-db
npx prisma generate
```

Or add postinstall script in your service:

```json
{
  "scripts": {
    "postinstall": "cd node_modules/@cvscharan/blogs-db && npx prisma generate || true"
  }
}
```

### Issue: Database connection errors

**Solution:**

1. Verify `DATABASE_URL` and `MONGODB_URI` are correct
2. Check database is running and accessible
3. Verify SSL/TLS settings for production databases

### Issue: Type errors after package update

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 7. Version Management

### Updating to Latest Version

```bash
npm update @cvscharan/blogs-db@latest
```

### Using Specific Version

```bash
npm install @cvscharan/blogs-db@1.0.5
```

### Lock to Major Version

```json
{
  "dependencies": {
    "@cvscharan/blogs-db": "^1.0.0"
  }
}
```

---

## 8. Testing

### Mock Prisma in Tests

```typescript
// tests/mocks/prisma.mock.ts
export const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  post: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@cvscharan/blogs-db', () => ({
  getPrismaClient: () => mockPrisma,
  UserRole: { READER: 'READER', AUTHOR: 'AUTHOR' },
}));
```

### Mock MongoDB in Tests

```typescript
// Use mongodb-memory-server for integration tests
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectMongoDB();
});

afterAll(async () => {
  await disconnectMongoDB();
  await mongoServer.stop();
});
```

---

## Summary

The `@cvscharan/blogs-db` package provides:

- ✅ **Type-safe database access** for PostgreSQL and MongoDB
- ✅ **Consistent schema** across all services
- ✅ **Easy integration** with minimal setup
- ✅ **Production-ready** connection management
- ✅ **Full TypeScript support** with generated types

Follow this guide to integrate the package into your microservices and maintain consistency across your entire blog platform!
