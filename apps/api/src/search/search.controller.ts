import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get('nearest')
    nearest(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('type') type: 'imam' | 'halqa' | 'maintenance',
    ) {
        const parsedLat = Number(lat);
        const parsedLng = Number(lng);
        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
            throw new BadRequestException('lat and lng are required numbers');
        }
        if (!['imam', 'halqa', 'maintenance'].includes(type)) {
            throw new BadRequestException('type must be imam | halqa | maintenance');
        }
        return this.searchService.nearest(parsedLat, parsedLng, type);
    }
}
