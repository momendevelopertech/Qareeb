import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly memory = new Map<string, { value: string; expiresAt: number }>();
    private readonly redis?: Redis;

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                lazyConnect: true,
            });
            this.redis.connect().catch((error) => {
                this.logger.warn(`Redis unavailable, using memory cache fallback: ${error?.message || error}`);
            });
        }
    }

    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit().catch(() => undefined);
        }
    }

    async getJSON<T>(key: string): Promise<T | null> {
        if (this.redis?.status === 'ready') {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) as T : null;
        }

        const item = this.memory.get(key);
        if (!item) return null;
        if (Date.now() >= item.expiresAt) {
            this.memory.delete(key);
            return null;
        }
        return JSON.parse(item.value) as T;
    }

    async setJSON(key: string, value: unknown, ttlSeconds: number) {
        const payload = JSON.stringify(value);
        if (this.redis?.status === 'ready') {
            await this.redis.set(key, payload, 'EX', ttlSeconds);
            return;
        }
        this.memory.set(key, { value: payload, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    async deleteByPrefix(prefix: string) {
        if (this.redis?.status === 'ready') {
            const keys = await this.redis.keys(`${prefix}*`);
            if (keys.length) await this.redis.del(...keys);
            return;
        }
        for (const key of this.memory.keys()) {
            if (key.startsWith(prefix)) this.memory.delete(key);
        }
    }
}
