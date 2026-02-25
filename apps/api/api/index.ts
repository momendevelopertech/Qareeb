import type { Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';

let cached: Handler | null = null;

export const main: Handler = async (event, context) => {
    if (!cached) {
        const { createApp } = await import('../dist/main');
        const app = await createApp();
        cached = serverlessExpress({ app });
    }
    return cached(event, context);
};
