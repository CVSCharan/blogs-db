# Blog Platform System Architecture & Design

## 1. Executive Summary

This document outlines the production-ready architecture for a comprehensive Blog Platform. The system follows a **Microservices Architecture** pattern, emphasizing **SOLID principles**, **Clean Architecture**, and **Event-Driven Communication**.

The goal is to build a scalable, maintainable, and robust blogging platform that supports web, admin, and mobile clients, with clear separation of concerns and high cohesion within services.

---

## 2. System Overview

The system is composed of **5 Core Backend Services**, **3 Frontend Applications**, **Shared Infrastructure Libraries**, and a **Polyglot Persistence** strategy.

### 2.1 Repository Landscape

| Repository            | Type       | Tech Stack          | Responsibility                     |
| --------------------- | ---------- | ------------------- | ---------------------------------- |
| **Frontends**         |            |                     |                                    |
| `blogs-web`           | Web App    | Next.js / React     | Public blog reading experience     |
| `blogs-admin`         | Web App    | Next.js / React     | Author & Admin dashboard           |
| `blogs-mobile`        | Mobile App | React Native        | Mobile blog reading experience     |
| **Backend Services**  |            |                     |                                    |
| `blogs-auth`          | Service    | Node.js / Express   | Identity, Auth, User Profiles      |
| `blogs-api`           | Service    | Node.js / Express   | Core Blog Domain (Posts, Comments) |
| `blogs-notifications` | Service    | Node.js / Express   | Email, Push, In-app notifications  |
| `blogs-analytics`     | Service    | Node.js / Express   | Analytics, Views, Engagement       |
| `blogs-media`         | Service    | Node.js / Express   | Image/Video Upload & Processing    |
| **Shared Libs**       |            |                     |                                    |
| `blogs-db`            | Library    | Prisma / TypeScript | PostgreSQL Schema & Client         |
| `blogs-cache`         | Library    | Redis / TypeScript  | Shared Caching Logic               |

### 2.2 Database Architecture (Polyglot Persistence)

| Database       | Use Case                           | Services                 |
| -------------- | ---------------------------------- | ------------------------ |
| **PostgreSQL** | Structured data, ACID transactions | auth, api, media         |
| **MongoDB**    | Analytics, logs, notifications     | analytics, notifications |
| **Redis**      | Caching, sessions, real-time       | All services             |

> **Note**: We use **PostgreSQL** for relational data (users, posts, comments) and **MongoDB** for high-throughput analytics, activity tracking, and flexible notification schemas. See [Polyglot Persistence Strategy](./polyglot-persistence-strategy.md) for details.

---

## 3. Architecture Principles

We will strictly adhere to the following principles to ensure a "Solid" foundation.

### 3.1 SOLID Principles (Applied to Microservices)

- **Single Responsibility Principle (SRP)**: Each service has one clear domain (e.g., Auth handles _only_ identity, not content).
- **Open/Closed Principle (OCP)**: Services are open for extension (via events/plugins) but closed for modification (core logic stable).
- **Liskov Substitution Principle (LSP)**: API contracts must be respected. Replacing a service version shouldn't break clients.
- **Interface Segregation Principle (ISP)**: Client-specific APIs (BFF pattern) or GraphQL to avoid over-fetching.
- **Dependency Inversion Principle (DIP)**: High-level modules (Domain) should not depend on low-level modules (DB/Infrastructure).

### 3.2 Project Structure & Clean Architecture

This project follows **Clean Architecture** principles (also known as Hexagonal or Onion Architecture).

#### Directory Layout

```
.
├── src/
│   ├── common/             # Shared utilities, constants, and types used across layers
│   ├── config/             # Environment variables and configuration setup
│   ├── domain/             # Enterprise business rules (The "Heart" of the app)
│   ├── application/        # Application business rules (Use Cases)
│   ├── infrastructure/     # External interfaces (Database, Cache, 3rd Party APIs)
│   ├── presentation/       # Entry points (REST API Controllers, Routes)
│   ├── middleware/         # Express middleware (Auth, Logging, Validation)
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point
│   └── index.ts            # Main entry point
├── tests/                  # Test suites
├── scripts/                # Utility scripts (e.g., seeding, verification)
└── docker-compose.yml      # Local development infrastructure
```

#### Detailed Layer Breakdown

**1. Domain Layer (`src/domain`)**
_Dependency Rule_: Depends on _nothing_.

- **Entities**: Core business objects (e.g., `Post`, `Author`, `Comment`).
- **Repository Interfaces**: Definitions of how to access data (e.g., `PostRepositoryInterface`).
- **Errors**: Domain-specific errors.

**2. Application Layer (`src/application`)**
_Dependency Rule_: Depends only on _Domain_.

- **Services**: Orchestrate data flow. Implement business use cases.
- **DTOs**: Data Transfer Objects (e.g., `CreatePostDto`).
- **Mappers**: Convert between DTOs and Entities.

**3. Infrastructure Layer (`src/infrastructure`)**
_Dependency Rule_: Depends on _Domain_ and _Application_.

- **Database**: `PrismaService` singleton.
- **Repositories**: Concrete implementations (e.g., `PostRepository`).
- **External Services**: Media storage, Email providers, Search engines.

**4. Presentation Layer (`src/presentation`)**
_Dependency Rule_: Depends on _Application_.

- **Controllers**: Handle HTTP requests (e.g., `PostController`).
- **Routes**: Define API endpoints.

**5. Common & Config**

- **`src/config`**: Centralized config. No direct `process.env` access.
- **`src/common`**: Helper functions, logger, utils.

#### Flow of Control

1. **Request** -> **Route** (`src/presentation/routes`)
2. -> **Controller** (`src/presentation/controllers`)
3. -> **Application Service** (`src/application/services`)
4. -> **Repository Interface** (`src/domain/repositories`)
5. -> **Infrastructure Repository** (`src/infrastructure/repositories`) -> **Database**
6. Data flows back up: Entity -> Service -> Controller -> **Response**

#### Naming Conventions

- **Files and Folders**:
  - Use `dot-case` for file names (e.g., `post.service.ts`, `comment.repository.ts`).
  - Use `kebab-case` for folder names (e.g., `post-management`, `comment-service`).
  - `index.ts` files are used for barrel exports within directories.
- **Classes**: `PascalCase` (e.g., `PostService`).
- **Interfaces**: `PascalCase` (e.g., `PostRepository`).
- **Functions/Methods/Vars**: `camelCase` (e.g., `getPostById`, `authorName`).
- **Constants**: `camelCase` (e.g., `jwtSecret`, `maxPostLength`).
- **Enums**: `PascalCase` (e.g., `PostStatus.Published`).
- **DTOs**: `PascalCase` + `Dto` suffix (e.g., `CreatePostDto`).
- **Mappers**: `PascalCase` + `Mapper` suffix (e.g., `PostMapper`).
- **Services**: `PascalCase` + `Service` suffix (e.g., `PostService`).
- **Controllers**: `PascalCase` + `Controller` suffix (e.g., `PostController`).
- **Repositories**: `PascalCase` + `Repository` suffix (e.g., `PostRepository`).
- **Entities**: `PascalCase` (e.g., `Post`).

### 3.3 12-Factor App

- **Config**: Stored in environment variables.
- **Backing Services**: Treated as attached resources (DB, Redis, S3).
- **Processes**: Stateless and share-nothing.
- **Disposability**: Fast startup and graceful shutdown.

---

## 4. Communication Strategy

A hybrid approach using **Synchronous** for reads/critical writes and **Asynchronous** for side effects.

### 4.1 Synchronous Communication (Request/Response)

- **Protocol**: REST (JSON) or GraphQL.
- **Usage**:
  - Frontend -> Backend (API Gateway / Load Balancer).
  - Service -> Service (Only when data is strictly required immediately, e.g., Auth check).
- **Pattern**: API Gateway acts as the single entry point, routing requests to appropriate services.

### 4.2 Asynchronous Communication (Event-Driven)

- **Protocol**: Message Queue (RabbitMQ) or Event Stream (Redis Streams / Kafka).
- **Usage**: Decoupling services.
- **Example Flow**:
  1. User publishes a new post (`blogs-api`).
  2. `PostPublished` event published.
  3. `blogs-notifications` consumes event -> Sends notification to subscribers.
  4. `blogs-analytics` consumes event -> Logs view count initialization.
  5. `blogs-media` consumes event -> Optimizes images for different devices.

### 4.3 Shared Data Strategy

- **`blogs-db`**: A shared library containing the Prisma Schema.
- **Database**: Single physical DB with logical separation (schemas: `auth`, `content`, etc.) OR separate DBs per service.
  - _Recommendation_: **Separate Schemas** within one Postgres cluster (easier management, strict boundaries enforced by user permissions).

---

## 5. Detailed Service Architecture

### 5.1 `blogs-auth` (Identity Provider)

- **Responsibilities**: Registration, Login, OAuth, Token Management, User/Author Profile Management, Role Management.
- **Tech**: Express, Passport.js/Lucia, JWT.
- **Events Published**: `UserCreated`, `UserLoggedIn`, `ProfileUpdated`, `AuthorVerified`.
- **Events Consumed**: `PostPublished` (to update author stats).

### 5.2 `blogs-api` (Content Core)

- **Responsibilities**: Managing Posts, Categories, Tags, Comments, Likes, Bookmarks, SEO metadata.
- **Tech**: Express, Full-text search (PostgreSQL or Elasticsearch).
- **Events Published**: `PostPublished`, `PostUpdated`, `PostDeleted`, `CommentCreated`, `PostLiked`.
- **Events Consumed**: `UserCreated` (create author profile), `MediaProcessed` (update post with optimized images).

### 5.3 `blogs-notifications`

- **Responsibilities**: Sending Emails (SendGrid/AWS SES), Push Notifications, In-App Alerts, Newsletter management.
- **Tech**: BullMQ (Job Queue) for reliable delivery.
- **Events Consumed**: Listens to _all_ relevant business events (`UserCreated`, `PostPublished`, `CommentCreated`, etc.).

### 5.4 `blogs-analytics`

- **Responsibilities**: Page views, Read time tracking, Popular posts, Author analytics, Engagement metrics.
- **Tech**: TimescaleDB or similar for time-series data (optional), or just Postgres.
- **Events Consumed**: All user action events (`PostViewed`, `PostLiked`, `CommentCreated`).

### 5.5 `blogs-media`

- **Responsibilities**: Image/Video upload, Resizing, Optimization, CDN integration, Storage management (S3/Cloudinary).
- **Tech**: Express, Sharp (image processing), AWS SDK or Cloudinary SDK.
- **Events Published**: `MediaUploaded`, `MediaProcessed`, `MediaDeleted`.
- **Events Consumed**: `PostDeleted` (cleanup associated media).

---

## 6. Data Model

> **Note**: This section shows **PostgreSQL schemas only**. For MongoDB collections (Analytics, Notifications, Logs), see [Polyglot Persistence Strategy](./polyglot-persistence-strategy.md).

### 6.1 PostgreSQL Schema - Auth Domain (`blogs-auth`)

```prisma
// User and Authentication
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String?   // Null for OAuth users

  role          UserRole  @default(READER)
  isVerified    Boolean   @default(false)

  profile       Profile?
  sessions      Session[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

enum UserRole {
  READER
  AUTHOR
  EDITOR
  ADMIN
}

model Profile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstName     String?
  lastName      String?
  displayName   String?
  bio           String?   @db.Text
  avatar        String?
  website       String?

  // Social Links
  twitter       String?
  linkedin      String?
  github        String?

  // Author-specific
  isAuthorVerified Boolean @default(false)
  authorBadge      String? // "Expert", "Contributor", etc.

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("profiles")
}

model Session {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  token         String    @unique
  expiresAt     DateTime

  createdAt     DateTime  @default(now())

  @@map("sessions")
}
```

### 6.2 PostgreSQL Schema - Content Domain (`blogs-api`)

```prisma
model Post {
  id            String      @id @default(uuid())
  authorId      String

  title         String
  slug          String      @unique
  excerpt       String?     @db.Text
  content       String      @db.Text
  coverImage    String?

  status        PostStatus  @default(DRAFT)
  visibility    PostVisibility @default(PUBLIC)

  // SEO
  metaTitle     String?
  metaDescription String?   @db.Text
  keywords      String[]

  // Engagement (denormalized from MongoDB)
  viewCount     Int         @default(0)
  likeCount     Int         @default(0)
  commentCount  Int         @default(0)
  readTime      Int?        // in minutes

  // Publishing
  publishedAt   DateTime?
  scheduledAt   DateTime?

  // Relations
  categories    PostCategory[]
  tags          PostTag[]
  comments      Comment[]
  likes         Like[]
  bookmarks     Bookmark[]

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([authorId])
  @@index([status])
  @@index([publishedAt])
  @@index([slug])
  @@map("posts")
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED
}

enum PostVisibility {
  PUBLIC
  UNLISTED
  PRIVATE
}

model Category {
  id            String      @id @default(uuid())
  name          String      @unique
  slug          String      @unique
  description   String?     @db.Text
  icon          String?
  color         String?

  parentId      String?
  parent        Category?   @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children      Category[]  @relation("CategoryHierarchy")

  posts         PostCategory[]

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("categories")
}

model Tag {
  id            String      @id @default(uuid())
  name          String      @unique
  slug          String      @unique

  posts         PostTag[]

  createdAt     DateTime    @default(now())

  @@map("tags")
}

model PostCategory {
  postId        String
  categoryId    String

  post          Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  category      Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([postId, categoryId])
  @@map("post_categories")
}

model PostTag {
  postId        String
  tagId         String

  post          Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}

model Comment {
  id            String      @id @default(uuid())
  postId        String
  post          Post        @relation(fields: [postId], references: [id], onDelete: Cascade)

  authorId      String
  content       String      @db.Text

  // Nested comments
  parentId      String?
  parent        Comment?    @relation("CommentReplies", fields: [parentId], references: [id])
  replies       Comment[]   @relation("CommentReplies")

  status        CommentStatus @default(APPROVED)

  likeCount     Int         @default(0)

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}

enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  DELETED
}

model Like {
  id            String      @id @default(uuid())
  userId        String
  postId        String
  post          Post        @relation(fields: [postId], references: [id], onDelete: Cascade)

  createdAt     DateTime    @default(now())

  @@unique([userId, postId])
  @@index([postId])
  @@map("likes")
}

model Bookmark {
  id            String      @id @default(uuid())
  userId        String
  postId        String
  post          Post        @relation(fields: [postId], references: [id], onDelete: Cascade)

  createdAt     DateTime    @default(now())

  @@unique([userId, postId])
  @@index([userId])
  @@map("bookmarks")
}
```

### 6.3 PostgreSQL Schema - Media Domain (`blogs-media`)

```prisma
model Media {
  id            String      @id @default(uuid())
  userId        String      // Uploader

  filename      String
  originalName  String
  mimeType      String
  size          Int         // bytes

  // Storage
  storageProvider String    // "s3", "cloudinary"
  storageKey    String      // S3 key or Cloudinary public_id
  url           String

  // Variants (for images)
  variants      MediaVariant[]

  // Metadata
  width         Int?
  height        Int?
  duration      Int?        // for videos

  status        MediaStatus @default(PROCESSING)

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([userId])
  @@map("media")
}

enum MediaStatus {
  PROCESSING
  READY
  FAILED
}

model MediaVariant {
  id            String      @id @default(uuid())
  mediaId       String
  media         Media       @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  variant       String      // "thumbnail", "medium", "large"
  url           String
  width         Int?
  height        Int?
  size          Int?

  @@index([mediaId])
  @@map("media_variants")
}
```

### 6.4 MongoDB Collections

**Analytics, Notifications, and Logging data are stored in MongoDB for high-throughput and flexible schemas.**

See [Polyglot Persistence Strategy](./polyglot-persistence-strategy.md) for detailed MongoDB schema definitions including:

- **Analytics**: `pageViews`, `analyticsEvents`, `userActivity`, `searchQueries`
- **Notifications**: `notifications`, `notificationQueue`, `emailLogs`, `pushNotificationLogs`
- **Logs**: `auditLogs`, `systemLogs`, `errorLogs`, `performanceLogs`

---

## 7. Key Workflows

### 7.1 Publishing a Blog Post

1. **Author**: Creates draft in `blogs-admin`.
2. **API**: `POST /api/posts` (status: DRAFT)
   - Service validates content.
   - Service generates slug from title.
   - Service calculates read time.
3. **Author**: Uploads cover image.
4. **Media Service**: Processes image, creates variants.
5. **Media Service**: Publishes `MediaProcessed` event.
6. **API**: Updates post with optimized image URL.
7. **Author**: Clicks "Publish".
8. **API**: `PATCH /api/posts/:id` (status: PUBLISHED)
   - Service publishes `PostPublished` event.
9. **Notifications**: Sends email to subscribers.
10. **Analytics**: Initializes view tracking.

### 7.2 Commenting on a Post

1. **Reader**: Submits comment on `blogs-web`.
2. **API**: `POST /api/posts/:id/comments`
   - Service validates content (spam check).
   - Service creates comment (status: PENDING if moderation enabled).
   - Service publishes `CommentCreated` event.
3. **Notifications**: Notifies post author.
4. **Analytics**: Logs engagement event.

### 7.3 Newsletter Subscription

1. **User**: Subscribes to newsletter.
2. **Notifications**: `POST /api/subscriptions`
   - Service creates subscription record.
   - Service sends confirmation email.
3. **When Post Published**:
   - `PostPublished` event consumed.
   - Service queues email job for all subscribers.
   - BullMQ processes queue with rate limiting.

---

## 8. Infrastructure & Deployment

### 8.1 Containerization

- **Docker**: Each service has its own `Dockerfile`.
- **Docker Compose**: For local development, spinning up all services + DB + Redis + S3 (MinIO).

### 8.2 CI/CD Pipeline

- **GitHub Actions**:
  - Linting & Testing (Unit/Integration).
  - Build Docker Images.
  - Publish Shared Libs (`blogs-db`, `blogs-cache`) to GitHub Packages or npm.

### 8.3 API Gateway (Recommended)

- Use **Nginx** or a dedicated Gateway service (e.g., Kong, or a simple Express Gateway) to route:
  - `/auth/*` to Auth Service
  - `/api/*` to Content Service
  - `/media/*` to Media Service
  - `/analytics/*` to Analytics Service

### 8.4 CDN & Caching Strategy

- **Static Assets**: Serve via CDN (Cloudflare, AWS CloudFront).
- **API Caching**:
  - Cache popular posts (Redis).
  - Cache-Control headers for public content.
  - Invalidate cache on `PostUpdated` events.

### 8.5 Search Implementation

**Option 1: PostgreSQL Full-Text Search**

- Good for MVP, built-in.
- Use `tsvector` and `tsquery`.

**Option 2: Elasticsearch**

- Better for complex queries, faceted search.
- Sync data via events (`PostPublished` -> Index in ES).

---

## 9. Implementation Roadmap

### Phase 1: Foundation & Shared Infrastructure

1. **`blogs-db`**: Finalize Prisma Schema (Auth, Content, Analytics, Media models).
2. **`blogs-cache`**: Implement Redis client wrapper and Pub/Sub utilities.

### Phase 2: Core Services

1. **`blogs-auth`**: Implement authentication, user profiles, author verification.
2. **`blogs-api`**: Implement post CRUD, categories, tags, comments.

### Phase 3: Support Services

1. **`blogs-media`**: Implement upload, processing, storage.
2. **`blogs-notifications`**: Implement email notifications, newsletter.
3. **`blogs-analytics`**: Implement view tracking, engagement metrics.

### Phase 4: Frontend Integration

1. **`blogs-web`**: Public blog reading experience, SEO optimization.
2. **`blogs-admin`**: Author dashboard, content management.
3. **`blogs-mobile`**: Mobile reading experience.

---

## 10. Design Patterns to Use

- **Repository Pattern**: Abstract DB access.
- **Factory Pattern**: Creating different types of content (Post, Page, Tutorial).
- **Strategy Pattern**: Different storage providers (S3, Cloudinary, Local).
- **Observer/Pub-Sub**: Handling domain events.
- **Adapter Pattern**: Integrating third-party services (Email, Storage, Search).
- **Decorator Pattern**: Adding features to posts (SEO metadata, social sharing).

---

## 11. Security Considerations

### 11.1 Authentication & Authorization

- **JWT Tokens**: Short-lived access tokens (15 min), refresh tokens (7 days).
- **Role-Based Access Control (RBAC)**: Reader, Author, Editor, Admin.
- **OAuth Integration**: Google, GitHub, Twitter login.

### 11.2 Content Security

- **XSS Prevention**: Sanitize user input (comments, bio).
- **CSRF Protection**: Use CSRF tokens for state-changing operations.
- **Rate Limiting**: Prevent spam (comments, likes).
- **Content Moderation**: Automated spam detection + manual review queue.

### 11.3 Data Privacy

- **GDPR Compliance**: User data export, deletion.
- **Anonymous Analytics**: Don't track PII without consent.
- **Secure Media Storage**: Signed URLs for private content.

---

## 12. Performance Optimization

### 12.1 Caching Strategy

- **Post Content**: Cache published posts (1 hour TTL).
- **Author Profiles**: Cache author data (24 hour TTL).
- **Popular Posts**: Cache trending posts list (15 min TTL).
- **Comment Counts**: Cache aggregated counts (5 min TTL).

### 12.2 Database Optimization

- **Indexes**: On frequently queried fields (slug, authorId, publishedAt).
- **Pagination**: Cursor-based for infinite scroll.
- **Eager Loading**: Use Prisma `include` to avoid N+1 queries.
- **Read Replicas**: For analytics queries (optional).

### 12.3 Media Optimization

- **Image Compression**: Automatic compression on upload.
- **Responsive Images**: Generate multiple sizes (thumbnail, medium, large).
- **Lazy Loading**: Load images as user scrolls.
- **WebP Format**: Serve modern formats with fallbacks.

---

## 13. Monitoring & Observability

### 13.1 Logging

- **Structured Logging**: Winston with JSON format.
- **Log Levels**: ERROR, WARN, INFO, DEBUG.
- **Centralized Logs**: Aggregate to ELK stack or CloudWatch.

### 13.2 Metrics

- **Application Metrics**: Request rate, response time, error rate.
- **Business Metrics**: Posts published, comments created, user signups.
- **Infrastructure Metrics**: CPU, memory, disk usage.

### 13.3 Alerting

- **Error Alerts**: Notify on 5xx errors, failed jobs.
- **Performance Alerts**: Notify on slow queries (>1s).
- **Business Alerts**: Notify on spam detection, unusual activity.

---

## 14. Code Style Enforcement

### ESLint Naming Convention Rules

To enforce the naming conventions outlined above, the following ESLint rules are applied:

```json
[
  "error",

  // ──────────────────────────────────────────────────────────────
  // 1. General PascalCase for types, classes, enums, etc.
  // ──────────────────────────────────────────────────────────────
  {
    "selector": ["class", "interface", "typeAlias", "enum", "typeParameter"],
    "format": ["PascalCase"],
    "leadingUnderscore": "forbid",
    "trailingUnderscore": "forbid"
  },

  // ──────────────────────────────────────────────────────────────
  // 2. Block I-prefix and "Interface" suffix on interfaces
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "interface",
    "format": ["PascalCase"],
    "custom": {
      "regex": "^(I[^a-z]|.*Interface$)",
      "match": false
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 3. Specific suffixes we DO want (DTO, Service, Controller, etc.)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "class",
    "suffix": ["Dto"],
    "format": ["PascalCase"],
    "custom": {
      "regex": "Dto$",
      "match": true
    }
  },
  {
    "selector": "class",
    "suffix": [
      "Service",
      "Controller",
      "Repository",
      "Mapper",
      "Guard",
      "Interceptor",
      "Filter",
      "Provider"
    ],
    "format": ["PascalCase"]
  },

  // ──────────────────────────────────────────────────────────────
  // 4. Variables & functions → camelCase (const allowed UPPER too)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": ["variable", "function", "parameter"],
    "format": ["camelCase", "PascalCase"],
    "leadingUnderscore": "allow"
  },

  {
    "selector": "variable",
    "modifiers": ["const"],
    "format": ["camelCase", "UPPER_CASE"],
    "leadingUnderscore": "allow"
  },

  {
    "selector": "variable",
    "modifiers": ["const", "exported"],
    "format": ["camelCase", "UPPER_CASE"]
  },

  // ──────────────────────────────────────────────────────────────
  // 5. Enum members → PascalCase (PostStatus.Published)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "enumMember",
    "format": ["PascalCase"]
  },

  // ──────────────────────────────────────────────────────────────
  // 6. Properties & methods → camelCase
  // ──────────────────────────────────────────────────────────────
  {
    "selector": [
      "objectLiteralProperty",
      "classProperty",
      "classMethod",
      "objectLiteralMethod",
      "parameterProperty"
    ],
    "format": ["camelCase", "UPPER_CASE"],
    "leadingUnderscore": "allow"
  },

  // ──────────────────────────────────────────────────────────────
  // 7. Optional: Allow _id style private fields
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "classProperty",
    "modifiers": ["private"],
    "format": ["camelCase"],
    "leadingUnderscore": "require"
  }
]
```

---

## 15. Feature Roadmap

### MVP Features (Phase 1)

- ✅ User registration & authentication
- ✅ Author profiles
- ✅ Create, edit, publish posts
- ✅ Categories & tags
- ✅ Comments
- ✅ Basic analytics (views)
- ✅ Email notifications

### Phase 2 Features

- 📝 Rich text editor (Markdown + WYSIWYG)
- 📝 Image upload & optimization
- 📝 SEO optimization (meta tags, sitemap)
- 📝 Social sharing
- 📝 Newsletter subscription
- 📝 Search functionality

### Phase 3 Features

- 🔮 Advanced analytics dashboard
- 🔮 Author monetization (subscriptions, tips)
- 🔮 Multi-language support
- 🔮 Mobile app
- 🔮 AI-powered content suggestions
- 🔮 Collaborative editing

This architecture provides a solid foundation for building a scalable, maintainable blog platform following industry best practices and SOLID principles.
