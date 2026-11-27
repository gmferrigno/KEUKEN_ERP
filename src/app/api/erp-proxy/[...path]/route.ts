import { handleErpProxyRequest } from '@/lib/server/erpProxy';
import type { NextRequest } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return handleErpProxyRequest(request, path || []);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
