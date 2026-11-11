'use server';

import { authService } from '@repo/erp-services/userContext/auth.service';
import { TFMeLicenseField } from '@repo/api-contracts/erp';
import { cookies, headers } from 'next/headers';

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60;

function resolveSessionMaxAgeSeconds(expiresIn?: number): number {
    if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
        return Math.floor(expiresIn);
    }
    return DEFAULT_SESSION_MAX_AGE_SECONDS;
}

async function getIsSecure(): Promise<boolean> {
    const headersList = await headers();
    const xForwardedProto = headersList.get('x-forwarded-proto');
    const referer = headersList.get('referer') || '';

    const clientIsHttps = referer.startsWith('https://');
    const clientIsHttp = referer.startsWith('http://');
    const proxyIsHttps = xForwardedProto === 'https';

    let isSecure = false;
    if (process.env.NODE_ENV === 'production') {
        if (clientIsHttp) {
            isSecure = false;
        } else if (clientIsHttps) {
            isSecure = true;
        } else {
            isSecure = proxyIsHttps;
        }
    }
    return isSecure;
}

export async function loginAction(email: string, password: string) {
    try {
        const authData = await authService.login(email, password);

        const cookieStore = await cookies();
        const isSecure = await getIsSecure();
        const sessionMaxAge = resolveSessionMaxAgeSeconds(authData.expiresIn);

        cookieStore.set('authToken', authData.accessToken, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: sessionMaxAge,
        });

        if (authData.mustChangePassword) {
            cookieStore.set('mustChangePassword', '1', {
                httpOnly: true,
                secure: isSecure,
                sameSite: 'lax',
                path: '/',
                maxAge: sessionMaxAge,
            });

            return {
                success: true,
                mustChangePassword: true,
                user: {
                    ...authData.user,
                    active: true,
                    roles: [] as string[],
                },
                token: authData.accessToken,
                expiresIn: sessionMaxAge,
            };
        }

        cookieStore.delete('mustChangePassword');

        const defaultCompanyId = authData.user?.companyIds?.[0];
        const profileData = await authService.getProfileContext(authData.accessToken, defaultCompanyId);

        const permissionsArray = Array.from(new Set([
            ...(profileData.rolesEffective || []),
            ...(profileData.scopesEffective || []),
        ]));

        cookieStore.set('permissions', encodeURIComponent(JSON.stringify(permissionsArray)), {
            httpOnly: false,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: sessionMaxAge,
        });

        if (profileData.license) {
            cookieStore.set('companyLicense', encodeURIComponent(JSON.stringify(profileData.license)), {
                httpOnly: false,
                secure: isSecure,
                sameSite: 'lax',
                path: '/',
                maxAge: sessionMaxAge,
            });
        }

        const userWithRoles = {
            ...authData.user,
            login: profileData.login,
            active: true,
            roles: permissionsArray,
        };

        return {
            success: true,
            mustChangePassword: false,
            user: userWithRoles,
            token: authData.accessToken,
            expiresIn: sessionMaxAge,
            profileContext: profileData,
        };
    } catch (error: any) {
        return { success: false, error: error.message || 'Error al iniciar sesión' };
    }
}

export async function updatePermissionsCookieAction(
    permissions: string[],
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
    try {
        const cookieStore = await cookies();
        const isSecure = await getIsSecure();
        cookieStore.set('permissions', encodeURIComponent(JSON.stringify(permissions)), {
            httpOnly: false,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: resolveSessionMaxAgeSeconds(maxAgeSeconds),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating permissions cookie:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCompanyLicenseCookieAction(
    license: TFMeLicenseField | undefined,
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
    try {
        const cookieStore = await cookies();
        const isSecure = await getIsSecure();
        if (license) {
            cookieStore.set('companyLicense', encodeURIComponent(JSON.stringify(license)), {
                httpOnly: false,
                secure: isSecure,
                sameSite: 'lax',
                path: '/',
                maxAge: resolveSessionMaxAgeSeconds(maxAgeSeconds),
            });
        } else {
            cookieStore.delete('companyLicense');
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error updating companyLicense cookie:', error);
        return { success: false, error: error.message };
    }
}

export async function setMustChangePasswordCookieAction(
    required: boolean,
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
    const cookieStore = await cookies();
    const isSecure = await getIsSecure();
    if (required) {
        cookieStore.set('mustChangePassword', '1', {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: resolveSessionMaxAgeSeconds(maxAgeSeconds),
        });
    } else {
        cookieStore.delete('mustChangePassword');
    }
    return { success: true };
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('authToken');
    cookieStore.delete('permissions');
    cookieStore.delete('companyLicense');
    cookieStore.delete('mustChangePassword');
}
