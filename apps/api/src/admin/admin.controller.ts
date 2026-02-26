import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('dashboard/stats')
    @UseGuards(RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer', 'halqa_reviewer', 'maintenance_reviewer')
    getDashboardStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('users')
    @UseGuards(RolesGuard)
    @Roles('super_admin')
    findAllAdmins() {
        return this.adminService.findAllAdmins();
    }

    @Post('users')
    @UseGuards(RolesGuard)
    @Roles('super_admin')
    createAdmin(
        @Body() body: { email: string; password: string; role: string },
        @Req() req: any,
    ) {
        return this.adminService.createAdmin(body.email, body.password, body.role, req.user.id);
    }

    @Patch('users/:id')
    @UseGuards(RolesGuard)
    @Roles('super_admin')
    updateAdmin(
        @Param('id') id: string,
        @Body() body: { role?: string; is_active?: boolean },
    ) {
        return this.adminService.updateAdmin(id, body);
    }

    @Get('audit')
    @UseGuards(RolesGuard)
    @Roles('super_admin', 'full_reviewer')
    getAuditLogs(
        @Req() request: any,
    ) {
        const { entityType, entityId, page, limit, userId, action, from, to } = request.query || {};
        return this.adminService.getAuditLogs({
            entityType,
            entityId,
            userId,
            action,
            from,
            to,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
}
