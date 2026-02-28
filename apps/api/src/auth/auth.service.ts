import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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

        const accessToken = this.jwtService.sign({ ...payload, typ: 'access' }, { jwtid: randomUUID() });
        const refreshToken = this.jwtService.sign(
            { ...payload, typ: 'refresh' },
            {
                secret: process.env.JWT_REFRESH_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY || 'dev-secret-key',
                expiresIn: rememberMe ? process.env.JWT_REFRESH_REMEMBER_TTL || '30d' : process.env.JWT_REFRESH_TTL || '1d',
                algorithm: process.env.JWT_REFRESH_PRIVATE_KEY || process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256',
                issuer: process.env.JWT_ISSUER || 'qareeb-api',
                audience: process.env.JWT_AUDIENCE || 'qareeb-web',
                jwtid: randomUUID(),
            },
        );

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
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY || process.env.JWT_PRIVATE_KEY || 'dev-secret-key',
                issuer: process.env.JWT_ISSUER || 'qareeb-api',
                audience: process.env.JWT_AUDIENCE || 'qareeb-web',
                algorithms: [process.env.JWT_REFRESH_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256'],
            });

            if (payload.typ !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

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
                typ: 'access',
            };

            return {
                access_token: this.jwtService.sign(newPayload, { jwtid: randomUUID() }),
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    async changePassword(adminId: string, currentPassword: string, newPassword: string) {
        const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin || !admin.isActive) {
            throw new UnauthorizedException('Unauthorized');
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isCurrentValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        if (newPassword.length < 8) {
            throw new BadRequestException('New password must be at least 8 characters');
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
        if (!strongPasswordRegex.test(newPassword)) {
            throw new BadRequestException('New password must include uppercase, lowercase, number, and symbol');
        }

        const isSamePassword = await bcrypt.compare(newPassword, admin.passwordHash);
        if (isSamePassword) {
            throw new BadRequestException('New password must be different from current password');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.admin.update({
            where: { id: adminId },
            data: { passwordHash },
        });

        return { success: true };
    }
}
