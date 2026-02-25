import { Controller, Get, UseGuards, Req, Query, Patch, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notifications: NotificationsService) { }

    @Get('notifications')
    async list(@Req() req: any, @Query('status') status?: string) {
        const unreadOnly = status !== 'all';
        return this.notifications.list(req.user.id, unreadOnly);
    }

    @Get('notifications/count')
    async count(@Req() req: any) {
        return { count: await this.notifications.unreadCount(req.user.id) };
    }

    @Patch('notifications/:id/read')
    async markRead(@Req() req: any, @Param('id') id: string) {
        return this.notifications.markRead(req.user.id, id);
    }

    @Patch('notifications/read-all')
    async markAllRead(@Req() req: any) {
        return this.notifications.markAllRead(req.user.id);
    }
}
