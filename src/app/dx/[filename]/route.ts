import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

const UI_DX_DIR = resolve(process.cwd(), '../../packages/ui/src/theme/dx');

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    if (!/^dx\.[a-z0-9-]+\.css$/.test(filename)) {
        return new NextResponse('Not found', { status: 404 });
    }

    const filePath = resolve(UI_DX_DIR, filename);

    if (!existsSync(filePath)) {
        return new NextResponse(`Theme file not found: ${filename}`, { status: 404 });
    }

    const css = readFileSync(filePath, 'utf-8');

    return new NextResponse(css, {
        headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}
