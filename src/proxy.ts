import { canRenderRoute } from '@repo/access';
import { TFMeLicenseField } from '@repo/api-contracts/erp';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/activate'];
const accessExemptPaths = ['/refused'];

function matchesPath(pathname: string, prefixes: string[]): boolean {
    return prefixes.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function parsePermissionsCookie(cookieVal: string | undefined): string[] | null {
    if (!cookieVal) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(cookieVal));
        if (!Array.isArray(parsed) || !parsed.every((p) => typeof p === 'string')) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function parseLicenseCookie(cookieVal: string | undefined): TFMeLicenseField | null {
    if (!cookieVal) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(cookieVal));
        if (parsed === null) return null;
        if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as TFMeLicenseField;
    } catch {
        return null;
    }
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('authToken')?.value;
    const mustChangePassword =
        request.cookies.get('mustChangePassword')?.value === '1';

    const isPublicPath = matchesPath(pathname, publicPaths);
    const isAccessExempt = matchesPath(pathname, accessExemptPaths);

    if (!token && !isPublicPath && !isAccessExempt) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && mustChangePassword && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isPublicPath && !mustChangePassword) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (isPublicPath || isAccessExempt) {
        return NextResponse.next();
    }

    const userPermissions = parsePermissionsCookie(request.cookies.get('permissions')?.value);
    if (userPermissions === null) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const companyLicense = parseLicenseCookie(request.cookies.get('companyLicense')?.value);

    const canRenderGlobalView = canRenderRoute(pathname, userPermissions, companyLicense);

    if (!canRenderGlobalView) {
        return NextResponse.redirect(new URL('/refused', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|woff|woff2|ttf|eot)).*)',
    ]
};
