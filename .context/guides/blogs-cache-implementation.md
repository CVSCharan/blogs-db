# blogs-cache Library Implementation Plan

## Overview

Create a shared Redis caching library for the blog platform, following the same patterns as `blogs-db`.

---

## 1. Library Purpose

The `blogs-cache` library provides:

- ✅ Redis client singleton
- ✅ Type-safe caching operations
- ✅ Pre-built caching patterns (sessions, API, rate limiting)
- ✅ Consistent cache key management
- ✅ Error handling and fallbacks

---

## 2. Project Structure

```
blogs-cache/
├── src/
│   ├── client.ts              # Redis client singleton
│   ├── cache.service.ts       # Core cache operations
│   ├── patterns/
│   │   ├── session.cache.ts   # Session management
│   │   ├── api.cache.ts       # API response caching
│   │   ├── rate-limit.ts      # Rate limiting
│   │   └── counter.ts         # View counters
│   ├── types.ts               # TypeScript types
│   ├── utils/
│   │   ├── key-builder.ts     # Cache key utilities
│   │   └── serializer.ts      # JSON serialization
│   └── index.ts               # Main exports
├── tests/
│   ├── client.test.ts
│   ├── cache.service.test.ts
│   └── patterns/
│       ├── session.test.ts
│       └── rate-limit.test.ts
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── README.md
└── CHANGELOG.md
```

---

## 3. Core Implementation

### 3.1 Redis Client (`src/client.ts`)

```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        console.error('Redis connection error:', err);
        return true;
      },
    });

    redis.on('error', (error) => {
      console.error('Redis error:', error);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    // Graceful shutdown
    const cleanup = () => {
      void (async () => {
        if (redis) {
          await redis.quit();
          redis = null;
        }
      })();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
```

### 3.2 Cache Service (`src/cache.service.ts`)

```typescript
import { getRedisClient } from './client';

export class CacheService {
  private redis = getRedisClient();

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }
}

export const cache = new CacheService();
```

### 3.3 Session Pattern (`src/patterns/session.cache.ts`)

```typescript
import { cache } from '../cache.service';

const SESSION_TTL = 86400; // 24 hours
const SESSION_PREFIX = 'session';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
}

export class SessionCache {
  private buildKey(sessionId: string): string {
    return `${SESSION_PREFIX}:${sessionId}`;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    return await cache.get<SessionData>(this.buildKey(sessionId));
  }

  async set(sessionId: string, data: SessionData): Promise<void> {
    await cache.set(this.buildKey(sessionId), data, SESSION_TTL);
  }

  async delete(sessionId: string): Promise<void> {
    await cache.del(this.buildKey(sessionId));
  }

  async deleteAllForUser(userId: string): Promise<number> {
    return await cache.delPattern(`${SESSION_PREFIX}:*:${userId}`);
  }

  async refresh(sessionId: string): Promise<void> {
    await cache.expire(this.buildKey(sessionId), SESSION_TTL);
  }
}

export const sessionCache = new SessionCache();
```

### 3.4 Rate Limiting (`src/patterns/rate-limit.ts`)

```typescript
import { cache } from '../cache.service';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export class RateLimiter {
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const count = await cache.incr(key);

    if (count === 1) {
      await cache.expire(key, config.windowSeconds);
    }

    const ttl = await cache.ttl(key);
    const resetAt = Date.now() + ttl * 1000;
    const remaining = Math.max(0, config.maxRequests - count);

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt,
    };
  }

  async reset(identifier: string): Promise<void> {
    await cache.del(`ratelimit:${identifier}`);
  }
}

export const rateLimiter = new RateLimiter();
```

---

## 4. Package Configuration

### 4.1 `package.json`

```json
{
  "name": "@cvscharan/blogs-cache",
  "version": "1.0.0",
  "description": "Shared Redis caching library for Blog Platform",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^20.17.9",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "prettier": "^3.4.2",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.2"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/CVSCharan/blogs-cache.git"
  }
}
```

---

## 5. Usage Examples

### 5.1 In blogs-auth Service

```typescript
import { sessionCache } from '@cvscharan/blogs-cache';

// Store session
await sessionCache.set('session-123', {
  userId: 'user-456',
  email: 'user@example.com',
  role: 'AUTHOR',
  createdAt: new Date(),
});

// Get session
const session = await sessionCache.get('session-123');

// Delete session
await sessionCache.delete('session-123');
```

### 5.2 In blogs-api Service

```typescript
import { cache, rateLimiter } from '@cvscharan/blogs-cache';

// Cache blog post
await cache.set('post:123', post, 3600); // 1 hour TTL

// Get cached post
const cachedPost = await cache.get('post:123');

// Rate limiting
const result = await rateLimiter.checkLimit('user:456', {
  maxRequests: 100,
  windowSeconds: 60,
});

if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// tests/cache.service.test.ts
describe('CacheService', () => {
  it('should set and get values', async () => {
    await cache.set('test-key', { foo: 'bar' });
    const value = await cache.get('test-key');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('should handle TTL', async () => {
    await cache.set('ttl-key', 'value', 1);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const value = await cache.get('ttl-key');
    expect(value).toBeNull();
  });
});
```

### 6.2 Integration Tests

Use Redis Mock or test Redis instance

---

## 7. CI/CD Pipeline

Same as `blogs-db`:

- Linting
- Testing
- Building
- Publishing to GitHub Packages

---

## 8. Implementation Timeline

### Week 1: Core Library

- [ ] Set up project structure
- [ ] Implement Redis client
- [ ] Implement cache service
- [ ] Add basic tests

### Week 2: Patterns

- [ ] Session caching
- [ ] Rate limiting
- [ ] API caching
- [ ] View counters

### Week 3: Integration

- [ ] Integrate with blogs-auth
- [ ] Integrate with blogs-api
- [ ] Add monitoring

### Week 4: Optimization

- [ ] Performance testing
- [ ] Documentation
- [ ] Production deployment

---

## 9. Success Metrics

- ✅ Cache hit rate > 80%
- ✅ Response time < 100ms for cached requests
- ✅ Memory usage < 25 MB
- ✅ Zero cache-related errors in production

---

## Next Steps

1. Create `blogs-cache` repository
2. Implement core functionality
3. Publish to GitHub Packages
4. Integrate with services
5. Monitor and optimize

This library will provide a solid foundation for caching across your entire blog platform!
