import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

export async function createApp() {
    const app = await NestFactory.create(AppModule, {
        cors: false,
    });

    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.set('trust proxy', 1);
    httpAdapter.disable('x-powered-by');

    // Global prefix
    app.setGlobalPrefix('v1');

    app.use(json({ limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));
    app.use(urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));

    // Security headers
    app.use(
        helmet({
            crossOriginEmbedderPolicy: false,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            hsts: {
                maxAge: 63072000,
                includeSubDomains: true,
                preload: true,
            },
            frameguard: { action: 'deny' },
            contentSecurityPolicy: false,
        }),
    );
    app.use(cookieParser());

    // CORS
    const allowedOrigins = (process.env.CORS_ORIGIN || 'https://qareeb-web.vercel.app')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW === 'true';

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            try {
                const host = new URL(origin).host;
                const isExplicit = allowedOrigins.includes(origin);
                const isVercelPreview = allowVercelPreview && host.endsWith('.vercel.app');
                if (isExplicit || isVercelPreview) return callback(null, true);
            } catch {
                // no-op
            }
            return callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token'],
        exposedHeaders: ['X-Request-Id'],
        maxAge: 600,
    });

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    return app;
}

async function bootstrap() {
    const app = await createApp();
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Qareeb API running on http://localhost:${port}/v1`);
}

if (process.env.SERVERLESS !== 'true') {
    bootstrap();
}
