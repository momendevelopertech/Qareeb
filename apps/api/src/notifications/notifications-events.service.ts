import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const CHANNEL = 'qareeb:notifications';

@Injectable()
export class NotificationsEventsService implements OnModuleDestroy {
    private readonly logger = new Logger(NotificationsEventsService.name);
    private publisher?: Redis;
    private subscriber?: Redis;
    private readonly handlers = new Set<(payload: any) => void>();

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) return;
        this.publisher = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.subscriber = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.start().catch((error) => this.logger.warn(`Redis pub/sub disabled: ${error?.message || error}`));
    }

    private async start() {
        if (!this.publisher || !this.subscriber) return;
        await this.publisher.connect();
        await this.subscriber.connect();
        await this.subscriber.subscribe(CHANNEL);
        this.subscriber.on('message', (_channel, message) => {
            try {
                const payload = JSON.parse(message);
                for (const handler of this.handlers) handler(payload);
            } catch {
                // ignore malformed payloads
            }
        });
    }

    async publish(payload: any) {
        if (!this.publisher || this.publisher.status !== 'ready') {
            for (const handler of this.handlers) handler(payload);
            return;
        }
        await this.publisher.publish(CHANNEL, JSON.stringify(payload));
    }

    subscribe(handler: (payload: any) => void) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    async onModuleDestroy() {
        await this.publisher?.quit().catch(() => undefined);
        await this.subscriber?.quit().catch(() => undefined);
    }
}
