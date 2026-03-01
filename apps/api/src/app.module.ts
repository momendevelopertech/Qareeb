import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ImamsModule } from './imams/imams.module';
import { HalaqatModule } from './halaqat/halaqat.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MediaModule } from './media/media.module';
import { AdminModule } from './admin/admin.module';
import { LocationsModule } from './locations/locations.module';
import { AuditModule } from './audit/audit.module';
import { HealthController } from './health/health.controller';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { CacheModule } from './cache/cache.module';
import { GeoModule } from './geo/geo.module';
import { ImprovementsModule } from './improvements/improvements.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            // Load env from workspace root (../../.env) and local (.env) so dev commands from workspace work.
            envFilePath: ['../../.env', '.env'],
        }),
        // Rate limiting profiles (global default + tighter auth limiter where applied with @Throttle).
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: Number(process.env.THROTTLE_LIMIT_PER_MINUTE || 60),
        }]),
        PrismaModule,
        AuthModule,
        ImamsModule,
        HalaqatModule,
        MaintenanceModule,
        MediaModule,
        AdminModule,
        LocationsModule,
        AuditModule,
        ChatModule,
        NotificationsModule,
        SearchModule,
        CacheModule,
        GeoModule,
        ImprovementsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    controllers: [HealthController],
})
export class AppModule { }
