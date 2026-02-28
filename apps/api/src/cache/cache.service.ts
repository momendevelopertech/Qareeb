import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly memory = new Map<string, { value: string; expiresAt: number }>();
    private readonly redis?: Redis;
    private readonly keyPrefix = process.env.REDIS_KEY_PREFIX || 'qareeb:prod:';

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                lazyConnect: true,
                enableOfflineQueue: false,
                tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            });
            this.redis.connect().catch((error) => {
                this.logger.warn(`Redis unavailable, using memory cache fallback: ${error?.message || error}`);
            });
        }
    }

    private withPrefix(key: string) {
        return `${this.keyPrefix}${key}`;
    }

    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit().catch(() => undefined);
        }
    }

    async getJSON<T>(key: string): Promise<T | null> {
        const prefixedKey = this.withPrefix(key);
        if (this.redis?.status === 'ready') {
            const value = await this.redis.get(prefixedKey);
            return value ? JSON.parse(value) as T : null;
        }

        const item = this.memory.get(prefixedKey);
        if (!item) return null;
        if (Date.now() >= item.expiresAt) {
            this.memory.delete(prefixedKey);
            return null;
        }
        return JSON.parse(item.value) as T;
    }

    async setJSON(key: string, value: unknown, ttlSeconds: number) {
        const prefixedKey = this.withPrefix(key);
        const payload = JSON.stringify(value);
        if (this.redis?.status === 'ready') {
            await this.redis.set(prefixedKey, payload, 'EX', ttlSeconds);
            return;
        }
        this.memory.set(prefixedKey, { value: payload, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    async deleteByPrefix(prefix: string) {
        const prefixed = this.withPrefix(prefix);
        if (this.redis?.status === 'ready') {
            const keys = await this.redis.keys(`${prefixed}*`);
            if (keys.length) await this.redis.del(...keys);
            return;
        }
        for (const key of this.memory.keys()) {
            if (key.startsWith(prefixed)) this.memory.delete(key);
        }
    }
}
