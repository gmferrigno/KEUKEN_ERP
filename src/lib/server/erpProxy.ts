import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const HOP_BY_HOP = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'cookie',
]);

function resolveBackendBase(): string {
    const raw = process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
    if (!raw) return '';
    return raw.endsWith('/') ? raw : `${raw}/`;
}

export async function handleErpProxyRequest(
    request: NextRequest,
    pathSegments: string[],
): Promise<NextResponse> {
    const backendBase = resolveBackendBase();
    if (!backendBase) {
        return NextResponse.json({ detail: 'API URL not configured' }, { status: 500 });
    }

    const cookieToken = request.cookies.get('authToken')?.value;
    const incomingAuth = request.headers.get('authorization');
    const target = new URL(pathSegments.join('/') + request.nextUrl.search, backendBase);

    const headers = new Headers();
    request.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (HOP_BY_HOP.has(lower) || lower === 'authorization') return;
        headers.set(key, value);
    });
    if (cookieToken) {
        headers.set('Authorization', `Bearer ${cookieToken}`);
    } else if (incomingAuth) {
        headers.set('Authorization', incomingAuth);
    }

    const method = request.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let upstream: Response;
    try {
        upstream = await fetch(target, {
            method,
            headers,
            body: hasBody ? await request.arrayBuffer() : undefined,
            redirect: 'manual',
            cache: 'no-store',
        });
    } catch (error) {
        console.error('ERP proxy upstream error:', error);
        return NextResponse.json({ detail: 'Upstream unavailable' }, { status: 502 });
    }

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (HOP_BY_HOP.has(lower) || lower === 'content-encoding') return;
        responseHeaders.set(key, value);
    });

    return new NextResponse(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
    });
}
