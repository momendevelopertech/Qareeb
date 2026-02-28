import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env.JWT_ACCESS_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY || 'dev-secret-key',
            signOptions: {
                expiresIn: process.env.JWT_ACCESS_TTL || '15m',
                algorithm: process.env.JWT_ACCESS_PRIVATE_KEY || process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256',
                issuer: process.env.JWT_ISSUER || 'qareeb-api',
                audience: process.env.JWT_AUDIENCE || 'qareeb-web',
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
    exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule { }
