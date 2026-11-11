import { canRenderRoute } from '@repo/access';
import { TFMeLicenseField } from '@repo/api-contracts/erp';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Rutas que no deben pasar por chequeo de módulos/permisos ni exigir sesión. */
const publicPaths = ['/login'];

/** Rutas autenticadas exentas del filtro canRenderRoute (no expulsar / no redirigir en loop). */
const accessExemptPaths = ['/refused'];

function matchesPath(pathname: string, prefixes: string[]): boolean {
    return prefixes.some(path => pathname === path || pathname.startsWith(`${path}/`));
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

    // Gate first-login / forced password change: stay on /login until flag is cleared.
    if (token && mustChangePassword && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isPublicPath && !mustChangePassword) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // /refused (y similares) deben renderizar sin re-evaluar canRenderRoute,
    // o un fallo de cookie/licencia puede disparar un loop de redirect.
    if (isPublicPath || isAccessExempt) {
        return NextResponse.next();
    }

    const cookieVal = request.cookies.get('permissions')?.value;
    let userPermissions: string[] = [];

    try {
        userPermissions = cookieVal ? JSON.parse(decodeURIComponent(cookieVal)) : [];
        if (!Array.isArray(userPermissions)) userPermissions = [];
    } catch (e) {
        console.error('Error parsing permissions cookie in proxy:', e);
        userPermissions = [];
    }

    const licenseCookieVal = request.cookies.get('companyLicense')?.value;
    let companyLicense: TFMeLicenseField = null;

    try {
        companyLicense = licenseCookieVal ? JSON.parse(decodeURIComponent(licenseCookieVal)) : null;
    } catch (e) {
        console.error('Error parsing companyLicense cookie in proxy:', e);
        companyLicense = null;
    }

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
