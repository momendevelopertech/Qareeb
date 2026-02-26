import {
    Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, NotFoundException, Req,
} from '@nestjs/common';
import { HalaqatService } from './halaqat.service';
import { CreateHalqaDto, HalqaQueryDto } from './dto/halqa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class HalaqatController {
    constructor(private readonly halaqatService: HalaqatService) { }

    @Get('halaqat')
    findAll(@Query() query: HalqaQueryDto) {
        return this.halaqatService.findAll(query);
    }

    @Get('halaqat/:id')
    async findOne(@Param('id') id: string) {
        const halqa = await this.halaqatService.findOne(id);
        if (!halqa) throw new NotFoundException('Halqa not found');
        return halqa;
    }

    @Post('halaqat')
    create(@Body() dto: CreateHalqaDto, @Req() req: any) {
        const createdBy = req.user?.email || req.user?.id || 'Guest';
        return this.halaqatService.create(dto, createdBy);
    }

    @Get('admin/halaqat')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'halqa_reviewer')
    findAllAdmin(@Query() query: HalqaQueryDto) {
        return this.halaqatService.findAll({ ...query, status: query.status || 'pending' });
    }

    @Patch('admin/halaqat/:id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'halqa_reviewer')
    approve(@Param('id') id: string, @Req() req: any) {
        return this.halaqatService.approve(id, req.user.id);
    }

    @Patch('admin/halaqat/:id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'halqa_reviewer')
    reject(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
        return this.halaqatService.reject(id, req.user.id, body.reason);
    }

    @Patch('admin/halaqat/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'halqa_reviewer')
    update(@Param('id') id: string, @Body() body: Partial<CreateHalqaDto>, @Req() req: any) {
        return this.halaqatService.update(id, req.user.id, body);
    }

    @Delete('admin/halaqat/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.halaqatService.remove(id, req.user.id);
    }
}
