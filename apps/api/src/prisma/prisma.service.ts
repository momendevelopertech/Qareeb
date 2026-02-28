import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        try {
            await this.$connect();
        } catch (error) {
            this.logger.error('Prisma initial connect failed; client will retry lazily.', error instanceof Error ? error.message : String(error));
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
