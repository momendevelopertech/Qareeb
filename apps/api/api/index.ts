import type { Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';

let cached: Handler | null = null;

export const main: Handler = async (event, context) => {
    if (!cached) {
        let createApp: (() => Promise<any>);
        try {
            ({ createApp } = await import('../dist/main'));
        } catch {
            // Fallback for environments where dist output is not bundled as expected.
            ({ createApp } = await import('../src/main'));
        }
        const app = await createApp();
        cached = serverlessExpress({ app });
    }
    return cached(event, context);
};
