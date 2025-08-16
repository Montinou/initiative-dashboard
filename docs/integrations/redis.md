# Redis Integration Documentation

## Overview
Redis is used as a high-performance caching layer for the Initiative Dashboard, improving response times and reducing database load for frequently accessed data.

## Configuration

### Environment Variables
```env
REDIS_URL=redis://default:E6mFWDoaAXMbg3qXtxQEYfxdIdpLsfsC@redis-10163.crce207.sa-east-1-2.ec2.redns.redis-cloud.com:10163
```

### Redis Cloud Setup
- **Provider**: Redis Enterprise Cloud
- **Region**: SA-EAST-1 (São Paulo)
- **Port**: 10163
- **Memory**: Configured based on plan
- **Persistence**: AOF every write
- **Eviction Policy**: allkeys-lru

## Client Implementation

### Redis Client (`lib/redis-client.ts`)
```typescript
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  // Skip on client-side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  // Skip if not configured
  if (!process.env.REDIS_URL) {
    return null;
  }
  
  // Return existing connection
  if (redisClient?.isReady) {
    return redisClient;
  }
  
  // Create new connection
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: (retries) => {
        if (retries > 1) {
          return new Error('Redis not available');
        }
        return Math.min(retries * 100, 1000);
      },
    },
  });
  
  await redisClient.connect();
  return redisClient;
}
```

## Caching Strategies

### 1. KPI Cache (`lib/cache/kpi-cache.ts`)
```typescript
const KPI_CACHE_TTL = 300; // 5 minutes

export async function getCachedKPIs(tenantId: string) {
  const key = `kpi:${tenantId}`;
  const cached = await getRedisValue(key);
  
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const kpis = await fetchKPIsFromDB(tenantId);
  
  // Cache for 5 minutes
  await setRedisValue(key, kpis, KPI_CACHE_TTL);
  
  return kpis;
}

// Invalidate on update
export async function invalidateKPICache(tenantId: string) {
  await deleteRedisValue(`kpi:${tenantId}`);
}
```

### 2. Dashboard Data Cache
```typescript
export async function getCachedDashboard(userId: string, role: string) {
  const key = `dashboard:${role}:${userId}`;
  const cached = await getRedisValue(key);
  
  if (cached && !isStale(cached.timestamp)) {
    return cached.data;
  }
  
  const data = await generateDashboardData(userId, role);
  
  await setRedisValue(key, {
    data,
    timestamp: Date.now()
  }, 600); // 10 minutes
  
  return data;
}
```

### 3. Query Result Cache
```typescript
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await getRedisValue<T>(key);
  if (cached) {
    return cached;
  }
  
  // Execute query
  const result = await queryFn();
  
  // Cache result
  await setRedisValue(key, result, ttl);
  
  return result;
}

// Usage
const areas = await cachedQuery(
  `areas:${tenantId}`,
  () => supabase.from('areas').select('*'),
  600
);
```

## Cache Patterns

### 1. Cache-Aside Pattern
```typescript
async function getData(id: string) {
  // Check cache
  const cached = await redis.get(`item:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const data = await database.fetch(id);
  
  // Update cache
  await redis.setex(`item:${id}`, 3600, JSON.stringify(data));
  
  return data;
}
```

### 2. Write-Through Cache
```typescript
async function updateData(id: string, data: any) {
  // Update database
  await database.update(id, data);
  
  // Update cache
  await redis.setex(`item:${id}`, 3600, JSON.stringify(data));
  
  // Invalidate related caches
  await redis.del(`list:items`);
}
```

### 3. Refresh-Ahead Pattern
```typescript
async function getWithRefresh(key: string, ttl: number) {
  const data = await redis.get(key);
  const ttlRemaining = await redis.ttl(key);
  
  // Refresh if close to expiry
  if (ttlRemaining < ttl * 0.2) {
    // Async refresh in background
    refreshInBackground(key);
  }
  
  return data;
}
```

## Rate Limiting

### Implementation (`lib/rate-limiter.ts`)
```typescript
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 3600
): Promise<boolean> {
  const key = `rate:${identifier}`;
  const client = await getRedisClient();
  
  if (!client) {
    // Allow if Redis unavailable
    return true;
  }
  
  const current = await client.incr(key);
  
  if (current === 1) {
    await client.expire(key, window);
  }
  
  return current <= limit;
}

// Middleware usage
export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const allowed = await checkRateLimit(`api:${ip}`, 1000, 3600);
  
  if (!allowed) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
}
```

## Session Management

### Session Storage
```typescript
export async function storeSession(
  sessionId: string,
  data: any,
  ttl: number = 86400 // 24 hours
) {
  const key = `session:${sessionId}`;
  await setRedisValue(key, data, ttl);
}

export async function getSession(sessionId: string) {
  const key = `session:${sessionId}`;
  return await getRedisValue(key);
}

export async function extendSession(sessionId: string, ttl: number = 86400) {
  const key = `session:${sessionId}`;
  const client = await getRedisClient();
  await client?.expire(key, ttl);
}
```

## Queue Management

### Job Queue Implementation
```typescript
export async function addToQueue(
  queueName: string,
  job: any
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  
  await client.lPush(
    `queue:${queueName}`,
    JSON.stringify({
      ...job,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    })
  );
}

export async function processQueue(
  queueName: string,
  processor: (job: any) => Promise<void>
) {
  const client = await getRedisClient();
  if (!client) return;
  
  while (true) {
    const job = await client.brPop(
      `queue:${queueName}`,
      30 // 30 second timeout
    );
    
    if (job) {
      try {
        await processor(JSON.parse(job.element));
      } catch (error) {
        // Add to dead letter queue
        await client.lPush(
          `dlq:${queueName}`,
          job.element
        );
      }
    }
  }
}
```

## Cache Invalidation

### Invalidation Strategies
```typescript
// 1. Direct invalidation
export async function invalidateCache(pattern: string) {
  const client = await getRedisClient();
  if (!client) return;
  
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
}

// 2. Tag-based invalidation
export async function invalidateByTag(tag: string) {
  const client = await getRedisClient();
  if (!client) return;
  
  const keys = await client.sMembers(`tag:${tag}`);
  if (keys.length > 0) {
    await client.del(keys);
    await client.del(`tag:${tag}`);
  }
}

// 3. Time-based invalidation (TTL)
export async function setCacheWithTTL(
  key: string,
  value: any,
  ttl: number
) {
  await setRedisValue(key, value, ttl);
}
```

## Monitoring and Metrics

### Health Check
```typescript
export async function redisHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: 'unhealthy', error: 'No connection' };
    }
    
    await client.ping();
    
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}
```

### Performance Metrics
```typescript
export async function getRedisMetrics() {
  const client = await getRedisClient();
  if (!client) return null;
  
  const info = await client.info('stats');
  const memory = await client.info('memory');
  
  return {
    operations: parseInfo(info),
    memory: parseInfo(memory),
    connectedClients: await client.clientList(),
  };
}
```

## Error Handling

### Graceful Degradation
```typescript
export async function withCacheFallback<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  try {
    // Try cache first
    const cached = await getRedisValue<T>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn('Cache read failed, continuing without cache');
  }
  
  // Fetch data
  const data = await fetchFn();
  
  // Try to cache (non-blocking)
  setRedisValue(cacheKey, data, ttl).catch(err =>
    console.warn('Cache write failed:', err)
  );
  
  return data;
}
```

### Connection Recovery
```typescript
export function setupRedisReconnection() {
  const client = getRedisClient();
  
  client?.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
  
  client?.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });
  
  client?.on('ready', () => {
    console.log('Redis connection restored');
  });
}
```

## Best Practices

1. **Always handle Redis unavailability** - App should work without cache
2. **Use appropriate TTLs** - Balance freshness vs performance
3. **Implement cache warming** - Pre-populate critical data
4. **Monitor memory usage** - Set eviction policies
5. **Use pipeline for batch operations** - Reduce round trips
6. **Implement circuit breakers** - Prevent cascade failures
7. **Log cache hit/miss ratios** - Monitor effectiveness

## Common Use Cases

### 1. API Response Caching
```typescript
app.get('/api/data', async (req, res) => {
  const cacheKey = `api:${req.path}:${JSON.stringify(req.query)}`;
  
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }
  
  const data = await fetchData(req.query);
  await setRedisValue(cacheKey, data, 300);
  
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});
```

### 2. Computed Aggregations
```typescript
export async function getAggregatedStats(tenantId: string) {
  const cacheKey = `stats:${tenantId}:${getDateKey()}`;
  
  return cachedQuery(cacheKey, async () => {
    // Expensive aggregation query
    return await db.aggregate({
      tenantId,
      // Complex aggregation pipeline
    });
  }, 3600); // Cache for 1 hour
}
```

### 3. Leaderboard
```typescript
export async function updateLeaderboard(userId: string, score: number) {
  const client = await getRedisClient();
  await client?.zAdd('leaderboard', { score, value: userId });
}

export async function getTopUsers(limit: number = 10) {
  const client = await getRedisClient();
  return await client?.zRange('leaderboard', 0, limit - 1, {
    REV: true,
    WITHSCORES: true,
  });
}
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check network connectivity
   - Verify Redis URL and credentials
   - Increase connection timeout

2. **Memory Issues**
   - Monitor memory usage
   - Adjust eviction policy
   - Implement key expiration

3. **Performance Degradation**
   - Check slow queries log
   - Monitor key patterns
   - Optimize data structures

### Debug Commands
```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# Check server info
INFO

# Monitor commands in real-time
MONITOR

# Check memory usage
INFO memory

# List all keys (use carefully)
KEYS *

# Check specific key TTL
TTL key_name

# Flush cache (use carefully)
FLUSHDB
```

## References

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [node-redis Documentation](https://github.com/redis/node-redis)
- [Redis Cloud Console](https://app.redislabs.com/)