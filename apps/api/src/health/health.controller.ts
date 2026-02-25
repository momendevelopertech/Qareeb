import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
    @Get('health')
    health() {
        return { ok: true, timestamp: new Date().toISOString() };
    }

    @Get('healthz')
    healthz() {
        return { ok: true, timestamp: new Date().toISOString() };
    }
}
