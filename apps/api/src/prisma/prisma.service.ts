import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        try {
            await this.$connect();
        } catch (error) {
            // Do not crash serverless boot on transient DB startup/network issues.
            // Prisma will retry lazily on first query.
            console.error('Prisma initial connect failed:', error);
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
