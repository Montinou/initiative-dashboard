import { NextResponse } from 'next/server';
import { getRedisClient, setRedisValue, getRedisValue, isRedisAvailable } from '@/lib/redis-client';

export async function GET() {
  try {
    // Check if Redis is available
    const available = await isRedisAvailable();
    
    if (!available) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'Redis is not available. Make sure Redis server is running.',
        connectionInfo: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          help: 'To start Redis locally: brew services start redis (Mac) or sudo service redis-server start (Linux)'
        }
      }, { status: 503 });
    }

    // Test set and get operations
    const testKey = 'test:ping';
    const testValue = { message: 'pong', timestamp: new Date().toISOString() };
    
    // Set value with 60 second TTL
    const setResult = await setRedisValue(testKey, testValue, 60);
    
    if (!setResult) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to set value in Redis'
      }, { status: 500 });
    }

    // Get value back
    const getValue = await getRedisValue(testKey);
    
    return NextResponse.json({
      status: 'connected',
      message: 'Redis is working properly!',
      test: {
        key: testKey,
        setValue: testValue,
        getValue: getValue,
        match: JSON.stringify(testValue) === JSON.stringify(getValue)
      },
      connectionInfo: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    });
  } catch (error: any) {
    console.error('Redis test error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to test Redis connection',
      help: 'Make sure Redis is installed and running. Install with: brew install redis (Mac) or apt-get install redis-server (Linux)'
    }, { status: 500 });
  }
}