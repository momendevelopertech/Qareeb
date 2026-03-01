import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ImprovementsService } from './improvements.service';
import { CreateImprovementDto } from './dto/create-improvement.dto';
import { AdminQueryImprovementsDto } from './dto/admin-query-improvements.dto';
import { UpdateImprovementDto } from './dto/update-improvement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class ImprovementsController {
    constructor(private readonly improvementsService: ImprovementsService) { }

    @Post('improvements')
    create(@Body() dto: CreateImprovementDto) {
        return this.improvementsService.create(dto);
    }

    @Get('admin/improvements')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer', 'halqa_reviewer', 'maintenance_reviewer')
    findAllForAdmin(@Query() query: AdminQueryImprovementsDto) {
        return this.improvementsService.findAllForAdmin(query);
    }

    @Patch('admin/improvements/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer', 'halqa_reviewer', 'maintenance_reviewer')
    update(@Param('id') id: string, @Body() dto: UpdateImprovementDto) {
        return this.improvementsService.update(id, dto);
    }

    @Delete('admin/improvements/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super_admin', 'full_reviewer', 'imam_reviewer', 'halqa_reviewer', 'maintenance_reviewer')
    remove(@Param('id') id: string) {
        return this.improvementsService.remove(id);
    }
}
