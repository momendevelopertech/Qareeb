import {
    Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, UseGuards, NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { ImamsService } from './imams.service';
import { CreateImamDto, ImamQueryDto } from './dto/imam.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class ImamsController {
    constructor(private readonly imamsService: ImamsService) { }

    // ── Public Routes ──

    @Get('imams')
    findAll(@Query() query: ImamQueryDto) {
        return this.imamsService.findAll(query);
    }

    @Get('imams/:id')
    async findOne(@Param('id') id: string) {
        const imam = await this.imamsService.findOne(id);
        if (!imam) throw new NotFoundException('Imam not found');
        return imam;
    }

    @Post('imams')
    create(@Body() dto: CreateImamDto, @Req() req: Request) {
        const ip = req.ip || req.socket.remoteAddress;
        const createdBy = (req as any).user?.email || (req as any).user?.id || 'Guest';
        return this.imamsService.create(dto, ip, createdBy);
    }

    // ── Admin Routes ──

    @Get('admin/imams')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer')
    findAllAdmin(@Query() query: ImamQueryDto) {
        return this.imamsService.findAll({ ...query, status: query.status || 'pending' });
    }

    @Patch('admin/imams/:id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer')
    approve(@Param('id') id: string, @Req() req: any) {
        return this.imamsService.approve(id, req.user.id);
    }

    @Patch('admin/imams/:id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer')
    reject(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
        return this.imamsService.reject(id, req.user.id, body.reason);
    }

    @Patch('admin/imams/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer')
    update(@Param('id') id: string, @Body() body: Partial<CreateImamDto>, @Req() req: any) {
        return this.imamsService.update(id, req.user.id, body);
    }

    @Delete('admin/imams/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.imamsService.remove(id, req.user.id);
    }
}
