import { createClient, RedisClientType } from 'redis';

export class CacheService {
  private static instance: CacheService;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async initialize(redisUrl: string): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.client = createClient({
        url: redisUrl,
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis Cache Service Connected');
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('Cache service initialized');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`Error invalidating cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.flushDb();
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('Cache service closed');
      } catch (error) {
        console.error('Error closing cache service:', error);
      }
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export default CacheService;
