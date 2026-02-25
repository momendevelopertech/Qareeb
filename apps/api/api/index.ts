type NodeHandler = (req: any, res: any) => unknown;

let cachedHandler: NodeHandler | null = null;

async function getHandler(): Promise<NodeHandler> {
    if (cachedHandler) return cachedHandler;

    const { createApp } = await import('../dist/main');
    const app = await createApp();
    await app.init();

    cachedHandler = app.getHttpAdapter().getInstance() as NodeHandler;
    return cachedHandler;
}

export default async function handler(req: any, res: any) {
    const expressHandler = await getHandler();
    return expressHandler(req, res);
}
