import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const hasAccessPrivateKey = Boolean(process.env.JWT_ACCESS_PRIVATE_KEY);
        const accessAlgorithm = hasAccessPrivateKey ? 'RS256' : 'HS256';
        const accessSecret = hasAccessPrivateKey
            ? (process.env.JWT_ACCESS_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY || process.env.JWT_ACCESS_PRIVATE_KEY)
            : (process.env.JWT_PRIVATE_KEY || 'dev-secret-key');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: accessSecret,
            algorithms: [accessAlgorithm],
            issuer: process.env.JWT_ISSUER || 'qareeb-api',
            audience: process.env.JWT_AUDIENCE || 'qareeb-web',
        });
    }

    async validate(payload: { sub: string; email: string; role: string; typ?: string }) {
        if (payload.typ && payload.typ !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
