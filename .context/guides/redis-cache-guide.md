# Redis Cache Implementation Guide

## Overview

This guide covers implementing Redis caching for your personal blog platform using the free Redis Cloud tier (30MB). Redis will be used for session management, API response caching, and rate limiting.

---

## Table of Contents

1. [Redis Cloud Setup](#redis-cloud-setup)
2. [blogs-cache Library](#blogs-cache-library)
3. [Architecture Integration](#architecture-integration)
4. [Caching Patterns](#caching-patterns)
5. [Implementation Steps](#implementation-steps)

---

## Redis Cloud Setup

### Step 1: Create Redis Cloud Account

1. Go to **https://redis.com/try-free/**
2. Sign up for a free account
3. Create a new database:
   - **Name**: `blogs-cache`
   - **Plan**: Free (30MB)
   - **Region**: Choose closest to your deployment
   - **Eviction Policy**: `allkeys-lru` (recommended)

### Step 2: Get Connection Details

After creation, you'll receive:

```
Host: redis-xxxxx.c1.us-east-1-2.ec2.cloud.redislabs.com
Port: 12345
Password: your-redis-password
```

### Step 3: Connection String Format

```bash
REDIS_URL="redis://:your-redis-password@redis-xxxxx.c1.us-east-1-2.ec2.cloud.redislabs.com:12345"
```

---

## blogs-cache Library

### Project Structure

```
blogs-cache/
├── src/
│   ├── client.ts          # Redis client singleton
│   ├── cache.service.ts   # Cache operations
│   ├── patterns/
│   │   ├── session.ts     # Session caching
│   │   ├── api.ts         # API response caching
│   │   └── rate-limit.ts  # Rate limiting
│   └── index.ts           # Main exports
├── package.json
├── tsconfig.json
└── README.md
```

### Core Features

1. **Session Management**
   - Store user sessions
   - Auto-expiration (24 hours)
   - Fast session lookup

2. **API Response Caching**
   - Cache blog posts
   - Cache category lists
   - Cache user profiles
   - TTL-based invalidation

3. **Rate Limiting**
   - Prevent API abuse
   - Per-user limits
   - Per-IP limits

4. **View Counters**
   - Real-time post views
   - Atomic increments
   - Periodic sync to database

---

## Architecture Integration

### Before (Without Cache)

```
┌─────────┐     ┌─────────┐     ┌──────────────┐
│ Client  │────▶│   API   │────▶│  PostgreSQL  │
└─────────┘     └─────────┘     └──────────────┘
```

### After (With Cache)

```
┌─────────┐     ┌─────────┐     ┌───────┐     ┌──────────────┐
│ Client  │────▶│   API   │────▶│ Redis │────▶│  PostgreSQL  │
└─────────┘     └─────────┘     └───────┘     └──────────────┘
                                     │
                                     └────▶ Cache Hit (Fast)
```

### Services Using Cache

1. **blogs-auth**: Session storage, rate limiting
2. **blogs-api**: Post caching, category caching
3. **blogs-analytics**: View counters, trending posts

---

## Caching Patterns

### 1. Cache-Aside Pattern (Lazy Loading)

**Use for**: Blog posts, user profiles

```typescript
async function getPost(id: string) {
  // 1. Check cache first
  const cached = await cache.get(`post:${id}`);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss - fetch from database
  const post = await db.post.findUnique({ where: { id } });

  // 3. Store in cache (TTL: 1 hour)
  await cache.set(`post:${id}`, JSON.stringify(post), 3600);

  return post;
}
```

### 2. Write-Through Pattern

**Use for**: User sessions, frequently updated data

```typescript
async function updateSession(sessionId: string, data: any) {
  // 1. Update cache
  await cache.set(`session:${sessionId}`, JSON.stringify(data), 86400);

  // 2. Update database
  await db.session.update({ where: { id: sessionId }, data });
}
```

### 3. Write-Behind Pattern (Async)

**Use for**: View counters, analytics

```typescript
async function incrementViewCount(postId: string) {
  // 1. Increment in Redis (fast)
  await cache.incr(`views:${postId}`);

  // 2. Sync to database every 5 minutes (background job)
  // This reduces database writes
}
```

### 4. Rate Limiting Pattern

**Use for**: API protection

```typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const count = await cache.incr(key);

  if (count === 1) {
    await cache.expire(key, 60); // 1 minute window
  }

  return count <= 100; // Max 100 requests per minute
}
```

---

## Implementation Steps

### Phase 1: Create blogs-cache Library

1. **Initialize project**

   ```bash
   mkdir blogs-cache && cd blogs-cache
   npm init -y
   npm install ioredis
   npm install --save-dev typescript @types/node @types/ioredis
   ```

2. **Create Redis client** (`src/client.ts`)
3. **Create cache service** (`src/cache.service.ts`)
4. **Create caching patterns** (`src/patterns/`)
5. **Add tests**
6. **Publish to GitHub Packages**

### Phase 2: Integrate with blogs-auth

1. **Install blogs-cache**

   ```bash
   npm install @cvscharan/blogs-cache
   ```

2. **Configure Redis URL** (`.env`)

   ```bash
   REDIS_URL="redis://..."
   ```

3. **Update session storage**
   - Replace in-memory sessions with Redis
   - Add session expiration (24 hours)

4. **Add rate limiting**
   - Login endpoint: 5 attempts per 15 minutes
   - API endpoints: 100 requests per minute

### Phase 3: Integrate with blogs-api

1. **Install blogs-cache**

2. **Add caching middleware**

   ```typescript
   app.use(cacheMiddleware({ ttl: 300 })); // 5 minutes
   ```

3. **Cache blog posts**
   - Cache individual posts (1 hour TTL)
   - Cache post lists (5 minutes TTL)
   - Invalidate on update/delete

4. **Cache categories and tags**
   - Cache category tree (1 hour TTL)
   - Cache tag cloud (30 minutes TTL)

### Phase 4: Add Analytics Caching

1. **Real-time view counters**
   - Increment in Redis on page view
   - Sync to PostgreSQL every 5 minutes

2. **Trending posts**
   - Track views in Redis sorted set
   - Get top 10 trending posts (fast)

---

## Cache Key Naming Convention

Use consistent naming for cache keys:

```
{service}:{resource}:{id}:{field}
```

**Examples:**

```
auth:session:abc123                    # Session data
api:post:post-123                      # Full post
api:post:post-123:views                # Post view count
api:category:all                       # All categories
api:user:user-456:profile              # User profile
ratelimit:user:user-789:login          # Login rate limit
trending:posts:daily                   # Trending posts
```

---

## Cache TTL Guidelines

| Data Type     | TTL          | Reason                          |
| ------------- | ------------ | ------------------------------- |
| Sessions      | 24 hours     | User convenience                |
| Blog posts    | 1 hour       | Content doesn't change often    |
| Post lists    | 5 minutes    | Balance freshness & performance |
| Categories    | 1 hour       | Rarely change                   |
| User profiles | 30 minutes   | May update occasionally         |
| View counters | No expiry    | Synced to DB periodically       |
| Rate limits   | 1-15 minutes | Short-lived protection          |

---

## Memory Usage Estimation

With 30MB free tier:

| Item          | Size  | Quantity | Total      |
| ------------- | ----- | -------- | ---------- |
| Sessions      | 3 KB  | 5,000    | 15 MB      |
| Cached posts  | 50 KB | 100      | 5 MB       |
| Categories    | 10 KB | 1        | 10 KB      |
| View counters | 100 B | 10,000   | 1 MB       |
| Rate limits   | 100 B | 10,000   | 1 MB       |
| **Total**     |       |          | **~22 MB** |

**Headroom**: 8 MB for growth ✅

---

## Monitoring & Maintenance

### Key Metrics to Track

1. **Hit Rate**: `cache_hits / (cache_hits + cache_misses)`
   - Target: > 80%

2. **Memory Usage**: Monitor via Redis Cloud dashboard
   - Alert at 25 MB (83%)

3. **Evictions**: Track key evictions
   - Should be minimal with proper TTLs

### Redis Commands for Debugging

```bash
# Check memory usage
INFO memory

# List all keys (use carefully in production)
KEYS *

# Check specific key
GET post:123
TTL post:123

# Monitor commands in real-time
MONITOR
```

---

## Best Practices

### ✅ Do's

1. **Set TTLs on all keys** - Prevent memory leaks
2. **Use consistent key naming** - Easy to debug
3. **Handle cache failures gracefully** - Fall back to database
4. **Monitor memory usage** - Stay within free tier
5. **Invalidate on updates** - Keep data fresh

### ❌ Don'ts

1. **Don't cache everything** - Only frequently accessed data
2. **Don't store large objects** - Keep values < 100 KB
3. **Don't use Redis as primary storage** - Always have database backup
4. **Don't forget error handling** - Redis can fail
5. **Don't hardcode connection strings** - Use environment variables

---

## Troubleshooting

### Issue: Connection Timeout

**Solution**: Check Redis Cloud firewall settings, verify connection string

### Issue: Memory Full

**Solution**:

- Reduce TTLs
- Remove unused keys
- Implement eviction policy

### Issue: Cache Stampede

**Solution**: Use cache locking pattern

```typescript
async function getCachedPost(id: string) {
  const lockKey = `lock:post:${id}`;
  const lock = await cache.set(lockKey, '1', 'NX', 'EX', 10);

  if (lock) {
    // Only one request fetches from DB
    const post = await db.post.findUnique({ where: { id } });
    await cache.set(`post:${id}`, JSON.stringify(post), 3600);
    await cache.del(lockKey);
    return post;
  } else {
    // Others wait and retry
    await sleep(100);
    return getCachedPost(id);
  }
}
```

---

## Next Steps

1. ✅ Set up Redis Cloud account
2. ✅ Create `blogs-cache` library
3. ✅ Integrate with `blogs-auth` (sessions)
4. ✅ Integrate with `blogs-api` (caching)
5. ✅ Add monitoring and alerts
6. ✅ Test and optimize

---

## Resources

- **Redis Cloud**: https://redis.com/try-free/
- **ioredis Docs**: https://github.com/redis/ioredis
- **Redis Commands**: https://redis.io/commands/
- **Caching Patterns**: https://redis.io/docs/manual/patterns/

---

## Summary

Redis caching will:

- ✅ **Improve performance** - Faster response times
- ✅ **Reduce database load** - Fewer queries
- ✅ **Enable new features** - Real-time counters, rate limiting
- ✅ **Cost-effective** - Free tier is sufficient
- ✅ **Learning opportunity** - Hands-on Redis experience

Start simple with session caching, then gradually add more patterns as needed!
