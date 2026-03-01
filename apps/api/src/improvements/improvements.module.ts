import { Module } from '@nestjs/common';
import { ImprovementsController } from './improvements.controller';
import { ImprovementsService } from './improvements.service';

@Module({
    controllers: [ImprovementsController],
    providers: [ImprovementsService],
})
export class ImprovementsModule { }
