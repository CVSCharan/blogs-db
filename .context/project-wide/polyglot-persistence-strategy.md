# Polyglot Persistence Strategy - Blog Platform

## 1. Executive Summary

This document outlines the **polyglot persistence architecture** for the Blog Platform, leveraging both **PostgreSQL** (relational) and **MongoDB** (document) databases to optimize for different data access patterns and requirements.

### 1.1 Technology Stack

- **PostgreSQL 15+**: Primary relational database for structured data
- **MongoDB 7+**: Document database for analytics, logs, and notifications
- **Redis**: Caching and real-time features
- **Prisma**: ORM for PostgreSQL
- **Mongoose**: ODM for MongoDB

### 1.2 Design Philosophy

> **"Use the right tool for the right job"**

- **PostgreSQL**: ACID transactions, complex relationships, data integrity
- **MongoDB**: High throughput, flexible schemas, time-series data
- **Redis**: Ephemeral data, caching, pub/sub

---

## 2. Data Distribution Strategy

### 2.1 PostgreSQL - Structured Domain Data

**Use Cases**:

- User authentication and profiles
- Blog posts and content
- Categories, tags, and taxonomies
- Comments and social interactions
- Media metadata

**Characteristics**:

- Strong consistency (ACID)
- Complex JOINs and relationships
- Referential integrity
- Normalized data structure

**Tables** (16 total):

```
Auth Domain:
  - users
  - profiles
  - sessions

Content Domain:
  - posts
  - categories
  - tags
  - post_categories (junction)
  - post_tags (junction)
  - comments
  - likes
  - bookmarks

Media Domain:
  - media
  - media_variants
```

---

### 2.2 MongoDB - Analytics & Activity Data

**Use Cases**:

- Page views and analytics
- User activity tracking
- Notification management
- Audit logs and system logs
- Real-time events

**Characteristics**:

- High write throughput
- Flexible schema (varying event types)
- Time-series optimized
- Horizontal scalability

**Collections** (12 total):

```
Analytics:
  - pageViews
  - analyticsEvents
  - userActivity
  - searchQueries

Notifications:
  - notifications
  - notificationQueue
  - emailLogs
  - pushNotificationLogs

Logs:
  - auditLogs
  - systemLogs
  - errorLogs
  - performanceLogs
```

---

## 3. MongoDB Schema Design

### 3.1 Analytics Collections

#### **Collection: `pageViews`**

**Purpose**: Track individual page views with engagement metrics.

```typescript
interface PageView {
  _id: ObjectId;

  // Post reference (from PostgreSQL)
  postId: string; // UUID from PostgreSQL posts table
  postSlug: string; // Denormalized for quick queries

  // User tracking
  userId?: string; // UUID if authenticated
  sessionId: string; // Anonymous session tracking

  // Technical details
  ipAddress: string; // Hashed for privacy
  userAgent: string;
  device: {
    type: "mobile" | "tablet" | "desktop";
    os: string;
    browser: string;
  };

  // Engagement metrics
  timeSpent: number; // seconds
  scrollDepth: number; // percentage (0-100)
  interacted: boolean; // clicked, commented, liked

  // Traffic source
  referrer?: string;
  source: string; // 'google', 'twitter', 'direct', etc.
  campaign?: string; // UTM campaign
  medium?: string; // UTM medium

  // Location (optional)
  geo?: {
    country: string;
    city: string;
    timezone: string;
  };

  // Timestamps
  timestamp: Date;
  exitedAt?: Date;
}
```

**Indexes**:

```javascript
db.pageViews.createIndex({ postId: 1, timestamp: -1 });
db.pageViews.createIndex({ userId: 1, timestamp: -1 });
db.pageViews.createIndex({ sessionId: 1 });
db.pageViews.createIndex({ timestamp: -1 });
db.pageViews.createIndex({ "device.type": 1 });

// TTL index - auto-delete after 90 days
db.pageViews.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
```

**Sharding Key**: `{ postId: 1, timestamp: 1 }` (for horizontal scaling)

---

#### **Collection: `analyticsEvents`**

**Purpose**: Generic event tracking for custom analytics.

```typescript
interface AnalyticsEvent {
  _id: ObjectId;

  // Event classification
  eventType: string; // 'post_liked', 'comment_created', 'search_performed'
  category: string; // 'engagement', 'content', 'user'

  // Entity references
  entityId: string; // postId, commentId, userId, etc.
  entityType: string; // 'post', 'comment', 'user'

  // Actor
  userId?: string;
  sessionId: string;

  // Event-specific data (flexible)
  properties: {
    [key: string]: any; // Custom properties per event type
  };

  // Context
  context: {
    page: string;
    referrer?: string;
    userAgent: string;
  };

  // Timestamps
  timestamp: Date;
}
```

**Example Events**:

```javascript
// Post liked
{
  eventType: 'post_liked',
  category: 'engagement',
  entityId: 'post-uuid-123',
  entityType: 'post',
  userId: 'user-uuid-456',
  properties: {
    postTitle: 'Introduction to TypeScript',
    authorId: 'author-uuid-789'
  },
  timestamp: new Date()
}

// Search performed
{
  eventType: 'search_performed',
  category: 'content',
  entityId: 'search-session-123',
  entityType: 'search',
  sessionId: 'session-abc',
  properties: {
    query: 'react hooks tutorial',
    resultsCount: 15,
    clickedResultPosition: 3
  },
  timestamp: new Date()
}
```

**Indexes**:

```javascript
db.analyticsEvents.createIndex({ eventType: 1, timestamp: -1 });
db.analyticsEvents.createIndex({ entityId: 1, timestamp: -1 });
db.analyticsEvents.createIndex({ userId: 1, timestamp: -1 });
db.analyticsEvents.createIndex({ timestamp: -1 });
db.analyticsEvents.createIndex({ category: 1, timestamp: -1 });

// TTL index - auto-delete after 180 days
db.analyticsEvents.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 15552000 }
);
```

---

#### **Collection: `userActivity`**

**Purpose**: Aggregate user activity timeline.

```typescript
interface UserActivity {
  _id: ObjectId;

  userId: string; // UUID from PostgreSQL

  // Activity details
  activityType: string; // 'post_created', 'comment_posted', 'profile_updated'
  action: string; // 'created', 'updated', 'deleted', 'liked'

  // Target entity
  targetId: string;
  targetType: string; // 'post', 'comment', 'user'
  targetTitle?: string; // Denormalized for display

  // Activity metadata
  metadata: {
    [key: string]: any;
  };

  // Visibility
  isPublic: boolean; // Show in public activity feed?

  // Timestamps
  timestamp: Date;
}
```

**Indexes**:

```javascript
db.userActivity.createIndex({ userId: 1, timestamp: -1 });
db.userActivity.createIndex({ activityType: 1, timestamp: -1 });
db.userActivity.createIndex({ isPublic: 1, timestamp: -1 });

// TTL index - auto-delete after 1 year
db.userActivity.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
```

---

#### **Collection: `searchQueries`**

**Purpose**: Track search behavior for analytics and improvements.

```typescript
interface SearchQuery {
  _id: ObjectId;

  // Query details
  query: string;
  normalizedQuery: string; // Lowercase, trimmed

  // User context
  userId?: string;
  sessionId: string;

  // Results
  resultsCount: number;
  clickedResults: Array<{
    postId: string;
    position: number;
    clickedAt: Date;
  }>;

  // Performance
  executionTime: number; // milliseconds

  // Filters applied
  filters?: {
    categories?: string[];
    tags?: string[];
    dateRange?: {
      from: Date;
      to: Date;
    };
  };

  timestamp: Date;
}
```

**Indexes**:

```javascript
db.searchQueries.createIndex({ normalizedQuery: 1, timestamp: -1 });
db.searchQueries.createIndex({ timestamp: -1 });
db.searchQueries.createIndex({ resultsCount: 1 });

// Text index for query analysis
db.searchQueries.createIndex({ query: "text" });
```

---

### 3.2 Notification Collections

#### **Collection: `notifications`**

**Purpose**: User notifications (in-app, email, push).

```typescript
interface Notification {
  _id: ObjectId;

  // Recipient
  userId: string; // UUID from PostgreSQL

  // Notification details
  type: string; // 'comment_reply', 'post_liked', 'new_follower'
  title: string;
  message: string;

  // Action link
  actionUrl?: string;
  actionText?: string;

  // Related entities
  relatedEntity?: {
    id: string;
    type: string; // 'post', 'comment', 'user'
  };

  // Actor (who triggered this notification)
  actorId?: string;
  actorName?: string; // Denormalized
  actorAvatar?: string; // Denormalized

  // Delivery channels
  channels: {
    inApp: {
      enabled: boolean;
      read: boolean;
      readAt?: Date;
    };
    email: {
      enabled: boolean;
      sent: boolean;
      sentAt?: Date;
      emailId?: string; // Reference to emailLogs
    };
    push: {
      enabled: boolean;
      sent: boolean;
      sentAt?: Date;
      pushId?: string; // Reference to pushNotificationLogs
    };
  };

  // Priority
  priority: "low" | "medium" | "high" | "urgent";

  // Timestamps
  createdAt: Date;
  expiresAt?: Date; // Auto-archive old notifications
}
```

**Indexes**:

```javascript
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, "channels.inApp.read": 1 });
db.notifications.createIndex({ type: 1, createdAt: -1 });
db.notifications.createIndex({ priority: 1, createdAt: -1 });

// TTL index - auto-delete after 90 days
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Aggregation Pipeline Example** (Get unread count):

```javascript
db.notifications.aggregate([
  { $match: { userId: "user-uuid-123", "channels.inApp.read": false } },
  { $count: "unreadCount" },
]);
```

---

#### **Collection: `notificationQueue`**

**Purpose**: Queue for processing notifications (BullMQ alternative).

```typescript
interface NotificationQueueItem {
  _id: ObjectId;

  // Queue metadata
  status: "pending" | "processing" | "completed" | "failed";
  priority: number; // Higher = more urgent

  // Notification data
  notificationId: string; // Reference to notifications collection
  userId: string;
  type: string;

  // Delivery details
  channels: ("inApp" | "email" | "push")[];

  // Retry logic
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;

  // Error tracking
  errors: Array<{
    message: string;
    timestamp: Date;
  }>;

  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}
```

**Indexes**:

```javascript
db.notificationQueue.createIndex({ status: 1, priority: -1, createdAt: 1 });
db.notificationQueue.createIndex({ nextRetryAt: 1 });
db.notificationQueue.createIndex({ userId: 1, status: 1 });

// TTL index - auto-delete completed items after 7 days
db.notificationQueue.createIndex(
  { completedAt: 1 },
  {
    expireAfterSeconds: 604800,
    partialFilterExpression: { status: "completed" },
  }
);
```

---

#### **Collection: `emailLogs`**

**Purpose**: Track all sent emails for debugging and compliance.

```typescript
interface EmailLog {
  _id: ObjectId;

  // Email details
  to: string; // Recipient email
  from: string; // Sender email
  subject: string;

  // Template
  templateId?: string;
  templateData?: {
    [key: string]: any;
  };

  // Provider details
  provider: "sendgrid" | "aws-ses" | "mailgun";
  providerId?: string; // External message ID

  // Status
  status: "queued" | "sent" | "delivered" | "bounced" | "failed";

  // Events
  events: Array<{
    type:
      | "queued"
      | "sent"
      | "delivered"
      | "opened"
      | "clicked"
      | "bounced"
      | "spam";
    timestamp: Date;
    metadata?: any;
  }>;

  // Related notification
  notificationId?: string;
  userId?: string;

  // Error tracking
  error?: {
    code: string;
    message: string;
  };

  // Timestamps
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
}
```

**Indexes**:

```javascript
db.emailLogs.createIndex({ to: 1, createdAt: -1 });
db.emailLogs.createIndex({ userId: 1, createdAt: -1 });
db.emailLogs.createIndex({ status: 1, createdAt: -1 });
db.emailLogs.createIndex({ providerId: 1 });

// TTL index - auto-delete after 30 days
db.emailLogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
```

---

#### **Collection: `pushNotificationLogs`**

**Purpose**: Track push notifications sent to mobile/web.

```typescript
interface PushNotificationLog {
  _id: ObjectId;

  // Recipient
  userId: string;
  deviceToken: string;
  platform: "ios" | "android" | "web";

  // Notification content
  title: string;
  body: string;
  data?: {
    [key: string]: any;
  };

  // Provider
  provider: "fcm" | "apns" | "web-push";
  providerId?: string;

  // Status
  status: "queued" | "sent" | "delivered" | "failed";

  // Related notification
  notificationId?: string;

  // Error tracking
  error?: {
    code: string;
    message: string;
  };

  // Timestamps
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
}
```

**Indexes**:

```javascript
db.pushNotificationLogs.createIndex({ userId: 1, createdAt: -1 });
db.pushNotificationLogs.createIndex({ deviceToken: 1, createdAt: -1 });
db.pushNotificationLogs.createIndex({ status: 1, createdAt: -1 });

// TTL index - auto-delete after 30 days
db.pushNotificationLogs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
);
```

---

### 3.3 Logging Collections

#### **Collection: `auditLogs`**

**Purpose**: Track all important system actions for compliance and debugging.

```typescript
interface AuditLog {
  _id: ObjectId;

  // Actor
  userId?: string; // Who performed the action
  userEmail?: string; // Denormalized
  userRole?: string; // Denormalized

  // Action details
  action: string; // 'user.created', 'post.published', 'user.deleted'
  resource: string; // 'user', 'post', 'comment'
  resourceId: string;

  // Changes (for updates)
  changes?: {
    before: any;
    after: any;
  };

  // Context
  ipAddress: string;
  userAgent: string;

  // Request details
  method?: string; // HTTP method
  endpoint?: string; // API endpoint

  // Result
  status: "success" | "failure";
  errorMessage?: string;

  // Timestamps
  timestamp: Date;
}
```

**Indexes**:

```javascript
db.auditLogs.createIndex({ userId: 1, timestamp: -1 });
db.auditLogs.createIndex({ action: 1, timestamp: -1 });
db.auditLogs.createIndex({ resource: 1, resourceId: 1, timestamp: -1 });
db.auditLogs.createIndex({ timestamp: -1 });

// Keep audit logs for 2 years (compliance)
db.auditLogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 63072000 });
```

---

#### **Collection: `systemLogs`**

**Purpose**: Application logs for debugging and monitoring.

```typescript
interface SystemLog {
  _id: ObjectId;

  // Log level
  level: "debug" | "info" | "warn" | "error" | "fatal";

  // Message
  message: string;

  // Context
  service: string; // 'blogs-api', 'blogs-auth', etc.
  environment: string; // 'development', 'staging', 'production'

  // Error details (if applicable)
  error?: {
    name: string;
    message: string;
    stack: string;
  };

  // Additional metadata
  metadata?: {
    [key: string]: any;
  };

  // Request context
  requestId?: string;
  userId?: string;

  // Timestamps
  timestamp: Date;
}
```

**Indexes**:

```javascript
db.systemLogs.createIndex({ level: 1, timestamp: -1 });
db.systemLogs.createIndex({ service: 1, timestamp: -1 });
db.systemLogs.createIndex({ requestId: 1 });
db.systemLogs.createIndex({ timestamp: -1 });

// TTL index - auto-delete after 30 days
db.systemLogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 });
```

---

#### **Collection: `errorLogs`**

**Purpose**: Dedicated error tracking for quick debugging.

```typescript
interface ErrorLog {
  _id: ObjectId;

  // Error details
  name: string;
  message: string;
  stack: string;

  // Severity
  severity: "low" | "medium" | "high" | "critical";

  // Context
  service: string;
  environment: string;

  // Request context
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;

  // Additional context
  context?: {
    [key: string]: any;
  };

  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;

  // Occurrence tracking
  firstOccurrence: Date;
  lastOccurrence: Date;
  occurrenceCount: number;

  // Timestamps
  timestamp: Date;
}
```

**Indexes**:

```javascript
db.errorLogs.createIndex({ name: 1, message: 1, timestamp: -1 });
db.errorLogs.createIndex({ severity: 1, resolved: 1, timestamp: -1 });
db.errorLogs.createIndex({ service: 1, timestamp: -1 });
db.errorLogs.createIndex({ resolved: 1, timestamp: -1 });

// TTL index - auto-delete resolved errors after 90 days
db.errorLogs.createIndex(
  { resolvedAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { resolved: true } }
);
```

---

#### **Collection: `performanceLogs`**

**Purpose**: Track API performance metrics.

```typescript
interface PerformanceLog {
  _id: ObjectId;

  // Request details
  method: string;
  endpoint: string;
  statusCode: number;

  // Timing
  duration: number; // milliseconds

  // Breakdown
  timings?: {
    database?: number;
    cache?: number;
    external?: number;
    processing?: number;
  };

  // Resource usage
  memoryUsage?: number; // MB
  cpuUsage?: number; // percentage

  // Context
  service: string;
  userId?: string;
  requestId?: string;

  // Timestamps
  timestamp: Date;
}
```

**Indexes**:

```javascript
db.performanceLogs.createIndex({ endpoint: 1, timestamp: -1 });
db.performanceLogs.createIndex({ duration: -1, timestamp: -1 });
db.performanceLogs.createIndex({ statusCode: 1, timestamp: -1 });

// TTL index - auto-delete after 7 days
db.performanceLogs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 604800 }
);
```

---

## 4. Data Synchronization Strategy

### 4.1 PostgreSQL → MongoDB

**Scenario**: When a post is published, sync to MongoDB for analytics.

```typescript
// In blogs-api service
async function publishPost(postId: string) {
  // 1. Update PostgreSQL
  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  // 2. Publish event
  await eventBus.publish("post.published", {
    postId: post.id,
    slug: post.slug,
    authorId: post.authorId,
    title: post.title,
  });

  // 3. MongoDB listener (in blogs-analytics service)
  eventBus.subscribe("post.published", async (event) => {
    await mongodb.collection("analyticsEvents").insertOne({
      eventType: "post_published",
      category: "content",
      entityId: event.postId,
      entityType: "post",
      userId: event.authorId,
      properties: {
        postTitle: event.title,
        postSlug: event.slug,
      },
      timestamp: new Date(),
    });
  });
}
```

### 4.2 MongoDB → PostgreSQL

**Scenario**: Aggregate analytics and update denormalized counts.

```typescript
// Scheduled job (runs every 5 minutes)
async function syncViewCounts() {
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: "$postId",
        viewCount: { $sum: 1 },
      },
    },
  ];

  const results = await mongodb
    .collection("pageViews")
    .aggregate(pipeline)
    .toArray();

  for (const result of results) {
    await prisma.post.update({
      where: { id: result._id },
      data: {
        viewCount: { increment: result.viewCount },
      },
    });
  }
}
```

---

## 5. Production-Ready Best Practices

### 5.1 MongoDB Configuration

**Replica Set** (High Availability):

```yaml
# docker-compose.yml
services:
  mongo-primary:
    image: mongo:7
    command: mongod --replSet rs0

  mongo-secondary-1:
    image: mongo:7
    command: mongod --replSet rs0

  mongo-secondary-2:
    image: mongo:7
    command: mongod --replSet rs0
```

**Connection String**:

```
mongodb://mongo-primary:27017,mongo-secondary-1:27017,mongo-secondary-2:27017/blog-platform?replicaSet=rs0
```

### 5.2 Backup Strategy

**PostgreSQL**:

- Daily full backups (pg_dump)
- Continuous WAL archiving
- Point-in-time recovery (PITR)

**MongoDB**:

- Daily snapshots (mongodump)
- Oplog backup for incremental recovery
- Cloud backup (MongoDB Atlas Backup)

### 5.3 Monitoring

**Metrics to Track**:

- Query performance (slow queries)
- Connection pool utilization
- Disk usage and growth rate
- Replication lag
- Cache hit ratio

**Tools**:

- **PostgreSQL**: pg_stat_statements, pgAdmin
- **MongoDB**: MongoDB Compass, Atlas Monitoring
- **APM**: New Relic, Datadog, Prometheus + Grafana

### 5.4 Security

**PostgreSQL**:

- SSL/TLS connections
- Row-level security (RLS)
- Encrypted backups
- Least privilege access

**MongoDB**:

- Authentication enabled
- Role-based access control (RBAC)
- Encryption at rest
- Network isolation

---

## 6. Service-to-Database Mapping

| Service               | PostgreSQL  | MongoDB    | Redis        |
| --------------------- | ----------- | ---------- | ------------ |
| `blogs-auth`          | ✅ Primary  | ❌         | ✅ Sessions  |
| `blogs-api`           | ✅ Primary  | ✅ Events  | ✅ Cache     |
| `blogs-notifications` | ❌          | ✅ Primary | ✅ Queue     |
| `blogs-analytics`     | ❌          | ✅ Primary | ✅ Real-time |
| `blogs-media`         | ✅ Metadata | ❌         | ✅ Cache     |

---

## 7. Migration Path

### Phase 1: PostgreSQL Only (MVP)

- Implement core features with PostgreSQL
- Use PostgreSQL for analytics (acceptable for low traffic)

### Phase 2: Add MongoDB for Analytics

- Migrate analytics to MongoDB
- Keep dual-write for transition period
- Validate data consistency

### Phase 3: Full Polyglot

- Move notifications to MongoDB
- Implement comprehensive logging
- Optimize for scale

---

This polyglot persistence strategy provides a robust, scalable foundation for a production-ready blog platform.
