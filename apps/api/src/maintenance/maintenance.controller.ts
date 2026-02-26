import {
    Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, NotFoundException, Req,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto, MaintenanceQueryDto } from './dto/maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    @Get('maintenance')
    findAll(@Query() query: MaintenanceQueryDto) {
        return this.maintenanceService.findAll(query);
    }

    @Get('maintenance/:id')
    async findOne(@Param('id') id: string) {
        const request = await this.maintenanceService.findOne(id);
        if (!request) throw new NotFoundException('Maintenance request not found');
        return request;
    }

    @Post('maintenance')
    create(@Body() dto: CreateMaintenanceDto, @Req() req: any) {
        try {
            const createdBy = req.user?.email || req.user?.id || 'Guest';
            return this.maintenanceService.create(dto, createdBy);
        } catch (error) {
            console.error('Maintenance create error:', error);
            throw error;
        }
    }

    @Get('admin/maintenance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'maintenance_reviewer')
    findAllAdmin(@Query() query: MaintenanceQueryDto) {
        return this.maintenanceService.findAll({ ...query, status: query.status || 'pending' });
    }

    @Patch('admin/maintenance/:id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'maintenance_reviewer')
    approve(@Param('id') id: string, @Req() req: any) {
        return this.maintenanceService.approve(id, req.user.id);
    }

    @Patch('admin/maintenance/:id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'maintenance_reviewer')
    reject(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
        return this.maintenanceService.reject(id, req.user.id, body.reason);
    }

    @Patch('admin/maintenance/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'maintenance_reviewer')
    update(@Param('id') id: string, @Body() body: Partial<CreateMaintenanceDto>, @Req() req: any) {
        return this.maintenanceService.update(id, req.user.id, body);
    }

    @Delete('admin/maintenance/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.maintenanceService.remove(id, req.user.id);
    }
}
