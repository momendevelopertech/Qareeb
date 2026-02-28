import { Body, Controller, HttpCode, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('admin/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(200)
    async login(
        @Body() body: { email: string; password: string; remember_me?: boolean },
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(body.email, body.password, body.remember_me ?? true);
        const rememberMe = body.remember_me ?? true;

        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
            path: '/v1/admin/auth',
        });

        return {
            access_token: result.access_token,
            admin: result.admin,
        };
    }

    @Post('refresh')
    @HttpCode(200)
    async refresh(@Req() req: Request) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token provided');
        }
        return this.authService.refreshToken(refreshToken);
    }

    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(200)
    async changePassword(
        @Req() req: any,
        @Body() body: { current_password: string; new_password: string },
    ) {
        return this.authService.changePassword(
            req.user.id,
            body.current_password,
            body.new_password,
        );
    }
}
