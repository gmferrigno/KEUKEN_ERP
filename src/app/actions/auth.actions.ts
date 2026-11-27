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
    if (process.env.NODE_ENV === 'production') {
        return true;
    }
    const headersList = await headers();
    const xForwardedProto = headersList.get('x-forwarded-proto');
    return xForwardedProto === 'https';
}

function buildPermissionsFromProfile(profile: {
    rolesEffective?: string[] | null;
    scopesEffective?: string[] | null;
}): string[] {
    return Array.from(new Set([
        ...(profile.rolesEffective || []),
        ...(profile.scopesEffective || []),
    ]));
}

async function writeAccessCookies(options: {
    permissions: string[];
    license?: TFMeLicenseField | null;
    maxAgeSeconds: number;
    clearLicenseIfEmpty?: boolean;
}) {
    const cookieStore = await cookies();
    const isSecure = await getIsSecure();
    const maxAge = resolveSessionMaxAgeSeconds(options.maxAgeSeconds);

    cookieStore.set('permissions', encodeURIComponent(JSON.stringify(options.permissions)), {
        httpOnly: false,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge,
    });

    if (options.license) {
        cookieStore.set('companyLicense', encodeURIComponent(JSON.stringify(options.license)), {
            httpOnly: false,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge,
        });
    } else if (options.clearLicenseIfEmpty) {
        cookieStore.delete('companyLicense');
    }
}

export async function syncAccessCookiesAction(
    companyId?: string | number | null,
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) {
            return { success: false as const, error: 'No auth token' };
        }

        const profileData = await authService.getProfileContext(
            token,
            companyId != null && companyId !== '' ? String(companyId) : undefined,
        );
        const permissions = buildPermissionsFromProfile(profileData);

        await writeAccessCookies({
            permissions,
            license: profileData.license ?? null,
            maxAgeSeconds,
            clearLicenseIfEmpty: true,
        });

        return {
            success: true as const,
            permissions,
            license: profileData.license ?? null,
            profileContext: profileData,
        };
    } catch (error: any) {
        console.error('Error syncing access cookies from server:', error);
        return { success: false as const, error: error?.message || 'Error syncing access cookies' };
    }
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
        const permissionsArray = buildPermissionsFromProfile(profileData);

        await writeAccessCookies({
            permissions: permissionsArray,
            license: profileData.license ?? null,
            maxAgeSeconds: sessionMaxAge,
            clearLicenseIfEmpty: true,
        });

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
