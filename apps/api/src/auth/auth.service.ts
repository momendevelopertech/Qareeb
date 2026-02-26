import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateAdmin(email: string, password: string) {
        const admin = await this.prisma.admin.findUnique({ where: { email } });
        if (!admin || !admin.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });

        return admin;
    }

    async login(email: string, password: string, rememberMe = true) {
        const admin = await this.validateAdmin(email, password);

        const payload = {
            sub: admin.id,
            email: admin.email,
            role: admin.role,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: rememberMe ? '30d' : '1d' });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
            },
        };
    }

    async refreshToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            const admin = await this.prisma.admin.findUnique({
                where: { id: payload.sub },
            });

            if (!admin || !admin.isActive) {
                throw new UnauthorizedException('Invalid token');
            }

            const newPayload = {
                sub: admin.id,
                email: admin.email,
                role: admin.role,
            };

            return {
                access_token: this.jwtService.sign(newPayload),
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
}
