'use client';

import {
    loginAction,
    logoutAction,
    setMustChangePasswordCookieAction,
    updateCompanyLicenseCookieAction,
    updatePermissionsCookieAction,
} from '@/app/actions/auth.actions';
import {
    canAccess as canAccessHelper,
    canRenderRoute,
    evaluateAccess as evaluateAccessHelper,
    hasModule as hasModuleHelper,
    isLicenseLocked as isLicenseLockedHelper,
    mapPermissionsToFrontend,
    IAccessEvaluation,
    ICapabilityRule,
    TCapabilityKey,
    TFMeLicenseField,
    TFPermissionsConfig,
    TFProductModuleCode,
    AccessProvider,
} from '@repo/access';
import { authService } from '@repo/erp-services/userContext/auth.service';
import { configureErpApiClient } from '@repo/erp-api-client';
import { ICompany, IFProfileContext, IFUser } from "@repo/api-contracts/erp";
import { companiesService } from '@repo/erp-services/userContext/companies.service';
import { getToken } from '@/lib/utils/token.helper';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AUTH_EXPIRES_AT_KEY = 'authExpiresAt';
const MUST_CHANGE_PASSWORD_KEY = 'mustChangePassword';
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60;

function getRemainingSessionMaxAgeSeconds(): number {
    const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
    const expiresAt = raw ? Number(raw) : NaN;
    if (!Number.isFinite(expiresAt)) {
        return DEFAULT_SESSION_MAX_AGE_SECONDS;
    }
    return Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
}

function buildEffectiveScopes(
    profile: IFProfileContext | null | undefined,
    fallbackRoles: string[] = [],
): string[] {
    if (!profile) return fallbackRoles;
    return Array.from(new Set([
        ...(profile.rolesEffective || []),
        ...(profile.scopesEffective || []),
    ]));
}

interface AuthContextType {
    isAuthenticated: boolean;
    mustChangePassword: boolean;
    user: IFUser | null;
    profileContext: IFProfileContext | null;
    companyLicense: TFMeLicenseField | null;
    isLicenseLocked: boolean;
    token: string;
    permissions: TFPermissionsConfig | undefined;
    effectiveScopes: string[];
    login: (email: string, password: string) => Promise<void | { mustChangePassword?: boolean }>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    companies: ICompany[];
    currentCompany: ICompany | null;
    changeCompany: (company: ICompany) => Promise<void>;
    refreshProfileContext: (companyId?: string, branchId?: string) => Promise<IFProfileContext | null>;
    includeInactive: boolean;
    isSuperAdmin: boolean;
    hasModule: (code: TFProductModuleCode) => boolean;
    canAccess: (rule: ICapabilityRule | TCapabilityKey) => boolean;
    evaluateAccess: (rule: ICapabilityRule | TCapabilityKey) => IAccessEvaluation;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [user, setUser] = useState<any | null>(null);
    const [profileContext, setProfileContext] = useState<IFProfileContext | null>(null);
    const [companyLicense, setCompanyLicense] = useState<TFMeLicenseField | null>(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<ICompany[]>([]);
    const [currentCompany, setCurrentCompany] = useState<ICompany | null>(null);
    const [permissions, setPermissions] = useState<TFPermissionsConfig>();
    const [effectiveScopes, setEffectiveScopes] = useState<string[]>([]);
    const [token, setToken] = useState<string>('');
    const profileRefreshSeq = useRef(0);
    const unauthorizedHandlingRef = useRef(false);
    const passwordChangeHandlingRef = useRef(false);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const restoreSession = async () => {
            const storedToken = getToken();
            const userData = localStorage.getItem('userData');
            const savedProfileContext = localStorage.getItem('profileContext');
            const savedCompanyLicense = localStorage.getItem('companyLicense');
            const savedCompanies = localStorage.getItem('companies');
            const savedCurrentCompany = localStorage.getItem('currentCompany');

            // Sin authToken en LS la sesión no puede restaurarse tras un remount (p.ej. /refused, 404).
            if (storedToken && localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1') {
                setToken(storedToken);
                setMustChangePassword(true);
                if (userData) {
                    try {
                        setUser(JSON.parse(userData));
                    } catch (e) {
                        console.error('Error parsing stored userData during password change gate:', e);
                    }
                }
                setLoading(false);
                return;
            }

            if (storedToken && userData) {
                setIsAuthenticated(true);
                setToken(storedToken);
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                let calculatedPermissions: string[] = parsedUser.roles || [];
                let restoredLicense: TFMeLicenseField | null = null;

                if (savedProfileContext) {
                    try {
                        const parsedProfileContext: IFProfileContext = JSON.parse(savedProfileContext);
                        setProfileContext(parsedProfileContext);
                        calculatedPermissions = buildEffectiveScopes(parsedProfileContext, parsedUser.roles || []);

                        if (parsedProfileContext.license && !savedCompanyLicense) {
                            restoredLicense = parsedProfileContext.license;
                            setCompanyLicense(parsedProfileContext.license);
                        }
                    } catch (e) {
                        console.error('Error parsing stored profileContext:', e);
                    }
                }

                if (savedCompanyLicense) {
                    try {
                        restoredLicense = JSON.parse(savedCompanyLicense);
                        setCompanyLicense(restoredLicense);
                    } catch (e) {
                        console.error('Error parsing stored companyLicense:', e);
                    }
                }

                setEffectiveScopes(calculatedPermissions);
                setPermissions(mapPermissionsToFrontend(calculatedPermissions));

                // Proxy lee cookies, no localStorage: re-sincronizar antes de liberar loading.
                // Sin esto el sidebar (React) puede mostrar rutas que el proxy redirige a /refused.
                await Promise.all([
                    updatePermissionsCookieAction(calculatedPermissions),
                    updateCompanyLicenseCookieAction(restoredLicense ?? undefined),
                ]).catch((err) => {
                    console.error('Error syncing access cookies on session restore:', err);
                });

                if (savedCompanies) {
                    let parsedCompanies: ICompany[] = JSON.parse(savedCompanies);
                    const ownedCompanyIds = new Set<string>((parsedUser.companyIds || []).map(String));
                    if (ownedCompanyIds.size > 0) {
                        parsedCompanies = parsedCompanies.filter(c => ownedCompanyIds.has(String(c.id)));
                    }
                    setCompanies(parsedCompanies);

                    let activeCompany: ICompany | null = null;
                    const savedPreviousCompanyId = localStorage.getItem('previousCompanyId');

                    if (savedCurrentCompany) {
                        try {
                            const parsed = JSON.parse(savedCurrentCompany);
                            activeCompany = parsedCompanies.find(c => String(c.id) === String(parsed.id)) || null;
                        } catch (e) {
                            console.error('Error parsing stored currentCompany:', e);
                        }
                    }

                    if (!activeCompany && savedPreviousCompanyId) {
                        activeCompany = parsedCompanies.find(c => String(c.id) === String(savedPreviousCompanyId)) || null;
                    }

                    if (!activeCompany && parsedCompanies.length > 0) {
                        activeCompany = parsedCompanies[0];
                    }

                    if (activeCompany) {
                        setCurrentCompany(activeCompany);
                        localStorage.setItem('currentCompany', JSON.stringify(activeCompany));
                        localStorage.setItem('previousCompanyId', String(activeCompany.id));
                    }
                }
            }
            setLoading(false);
        };

        void restoreSession();
    }, []);

    // Guard de sesión client-side: no expulsar en login/refused (páginas de acceso/denegación).
    useEffect(() => {
        if (loading) return;
        const isExemptPath =
            pathname.startsWith('/login') ||
            pathname.startsWith('/refused');
        if (mustChangePassword && !pathname.startsWith('/login')) {
            router.replace('/login');
            return;
        }
        if (!isAuthenticated && !mustChangePassword && !isExemptPath) {
            router.replace('/login');
        }
    }, [isAuthenticated, mustChangePassword, loading, pathname, router]);

    const completeAuthenticatedSession = async (
        authToken: string,
        authUser: any,
        initialProfileContext?: IFProfileContext | null,
    ) => {
        unauthorizedHandlingRef.current = false;
        passwordChangeHandlingRef.current = false;

        let companiesList: ICompany[] = [];
        let selectedCompany: ICompany | null = null;

        try {
            const companiesResponse = await companiesService.getAll({ limit: 500, offset: 0 }, authToken);
            const allCompanies = (companiesResponse.items || []) as unknown as ICompany[];

            // Filtrar para listar ÚNICAMENTE las empresas que el usuario posee
            const ownedCompanyIds = new Set<string>(
                (authUser.companyIds || initialProfileContext?.companyIds || []).map(String)
            );

            if (ownedCompanyIds.size > 0) {
                companiesList = allCompanies.filter(c => ownedCompanyIds.has(String(c.id)));
            } else {
                companiesList = allCompanies;
            }

            setCompanies(companiesList);
            localStorage.setItem('companies', JSON.stringify(companiesList));

            // Si existe previousCompanyId y está en las empresas del usuario, se carga por defecto
            const savedPreviousCompanyId = localStorage.getItem('previousCompanyId');
            const previousCompany = savedPreviousCompanyId
                ? companiesList.find(c => String(c.id) === String(savedPreviousCompanyId))
                : null;

            if (previousCompany) {
                selectedCompany = previousCompany;
            } else if (companiesList.length > 0) {
                selectedCompany = companiesList[0];
            }

            if (selectedCompany) {
                setCurrentCompany(selectedCompany);
                localStorage.setItem('currentCompany', JSON.stringify(selectedCompany));
                localStorage.setItem('previousCompanyId', String(selectedCompany.id));
            }
        } catch (err) {
            console.error('Error fetching companies on login:', err);
        }

        let fetchedProfileContext: IFProfileContext | null = initialProfileContext || null;

        if (selectedCompany?.id) {
            try {
                fetchedProfileContext = await authService.getProfileContext(authToken, selectedCompany.id);
            } catch (err) {
                console.error('Error fetching profile context for operational company:', err);
            }
        }

        if (fetchedProfileContext) {
            setProfileContext(fetchedProfileContext);
            localStorage.setItem('profileContext', JSON.stringify(fetchedProfileContext));

            const activeLicense = fetchedProfileContext.license || null;
            setCompanyLicense(activeLicense);
            if (activeLicense) {
                localStorage.setItem('companyLicense', JSON.stringify(activeLicense));
            } else {
                localStorage.removeItem('companyLicense');
            }

            const calculatedPermissions = buildEffectiveScopes(fetchedProfileContext);
            setEffectiveScopes(calculatedPermissions);
            setPermissions(mapPermissionsToFrontend(calculatedPermissions));

            // loginAction cookiea la 1ª company del backend; acá puede elegirse otra.
            // Aguardar cookies antes de navegar para que el proxy vea scopes/licencia correctos.
            const remainingMaxAge = getRemainingSessionMaxAgeSeconds();
            await Promise.all([
                updateCompanyLicenseCookieAction(activeLicense ?? undefined, remainingMaxAge),
                updatePermissionsCookieAction(calculatedPermissions, remainingMaxAge),
            ]).catch((err) => {
                console.error('Error syncing access cookies on login:', err);
            });

            const initialUser = {
                ...authUser,
                roles: fetchedProfileContext.rolesEffective || authUser.roles || [],
            };
            setUser(initialUser);
            localStorage.setItem('userData', JSON.stringify(initialUser));
        } else {
            const permissionsArray = authUser.roles || [];
            setEffectiveScopes(permissionsArray);
            setPermissions(mapPermissionsToFrontend(permissionsArray));
            await updatePermissionsCookieAction(
                permissionsArray,
                getRemainingSessionMaxAgeSeconds(),
            ).catch((err) => {
                console.error('Error syncing permissions cookie on login fallback:', err);
            });
            setUser(authUser);
            localStorage.setItem('userData', JSON.stringify(authUser));
        }

        localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
        setMustChangePassword(false);
        await setMustChangePasswordCookieAction(false).catch((err) => {
            console.error('Error clearing mustChangePassword cookie:', err);
        });
        setIsAuthenticated(true);
        setToken(authToken);
        router.push('/');
    };

    const login = async (loginInput: string, passwordInput: string) => {
        try {
            const result = await loginAction(loginInput, passwordInput);
            if (!result.success || !result.token || !result.user) {
                throw new Error(result.error || 'Login failed');
            }

            const authToken = result.token;
            const authUser = result.user;
            const expiresInSeconds = result.expiresIn ?? DEFAULT_SESSION_MAX_AGE_SECONDS;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
            localStorage.setItem('userData', JSON.stringify(authUser));
            setToken(authToken);
            setUser(authUser);

            if (result.mustChangePassword) {
                localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
                setMustChangePassword(true);
                setIsAuthenticated(false);
                return { mustChangePassword: true };
            }

            await completeAuthenticatedSession(authToken, authUser, result.profileContext);
        } catch (error: unknown) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        const authToken = token || getToken();
        if (!authToken) {
            throw new Error('No hay sesión activa para cambiar la contraseña');
        }

        await authService.changePassword(authToken, currentPassword, newPassword);

        const authUser = user || (localStorage.getItem('userData')
            ? JSON.parse(localStorage.getItem('userData') as string)
            : null);

        if (!authUser) {
            throw new Error('No se encontró el usuario de la sesión');
        }

        await completeAuthenticatedSession(authToken, authUser, null);
    };

    const logout = useCallback(async () => {
        // Guardar la empresa actual como previousCompanyId antes de cerrar sesión
        if (currentCompany?.id) {
            localStorage.setItem('previousCompanyId', String(currentCompany.id));
        }

        await logoutAction();

        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('profileContext');
        localStorage.removeItem('companyLicense');
        localStorage.removeItem('companies');
        localStorage.removeItem('currentCompany');
        localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
        localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);

        setIsAuthenticated(false);
        setMustChangePassword(false);
        setToken('');
        setUser(null);
        setProfileContext(null);
        setCompanyLicense(null);
        setPermissions(undefined);
        setEffectiveScopes([]);
        setCompanies([]);
        setCurrentCompany(null);
        router.push('/login');
    }, [currentCompany?.id, router]);

    useEffect(() => {
        const handleUnauthorized = () => {
            if (unauthorizedHandlingRef.current) return;
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
                return;
            }
            unauthorizedHandlingRef.current = true;
            void logout();
        };

        const handlePasswordChangeRequired = () => {
            if (passwordChangeHandlingRef.current) return;
            passwordChangeHandlingRef.current = true;
            localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
            setMustChangePassword(true);
            setIsAuthenticated(false);
            void setMustChangePasswordCookieAction(
                true,
                getRemainingSessionMaxAgeSeconds(),
            ).catch((err) => {
                console.error('Error setting mustChangePassword cookie:', err);
            });
            router.replace('/login');
        };

        configureErpApiClient({
            onUnauthorized: handleUnauthorized,
            onPasswordChangeRequired: handlePasswordChangeRequired,
        });
        return () => {
            configureErpApiClient({
                onUnauthorized: undefined,
                onPasswordChangeRequired: undefined,
            });
        };
    }, [logout, router]);

    const refreshProfileContext = async (companyId?: string, branchId?: string): Promise<IFProfileContext | null> => {
        const targetCompanyId = companyId || currentCompany?.id;
        if (token && targetCompanyId) {
            const refreshId = ++profileRefreshSeq.current;
            try {
                const newProfileContext = await authService.getProfileContext(token, targetCompanyId, branchId);
                if (refreshId !== profileRefreshSeq.current) return null;

                const newLicense = newProfileContext.license || null;
                const calculatedPermissions = buildEffectiveScopes(newProfileContext);

                // Cookies primero: si React re-renderiza / dispara un soft-nav a la ruta actual,
                // el proxy debe ver ya el contexto de la empresa nueva.
                const remainingMaxAge = getRemainingSessionMaxAgeSeconds();
                await Promise.all([
                    updateCompanyLicenseCookieAction(newLicense ?? undefined, remainingMaxAge).catch((err) => {
                        console.error('Error updating companyLicense cookie on refresh:', err);
                    }),
                    updatePermissionsCookieAction(calculatedPermissions, remainingMaxAge).catch((err) => {
                        console.error('Error updating permissions cookie on refresh:', err);
                    }),
                ]);
                if (refreshId !== profileRefreshSeq.current) return null;

                setProfileContext(newProfileContext);
                localStorage.setItem('profileContext', JSON.stringify(newProfileContext));

                setCompanyLicense(newLicense);
                if (newLicense) {
                    localStorage.setItem('companyLicense', JSON.stringify(newLicense));
                } else {
                    localStorage.removeItem('companyLicense');
                }

                setEffectiveScopes(calculatedPermissions);
                setPermissions(mapPermissionsToFrontend(calculatedPermissions));

                if (user) {
                    const updatedUser = { ...user, roles: newProfileContext.rolesEffective || [] };
                    setUser(updatedUser);
                    localStorage.setItem('userData', JSON.stringify(updatedUser));
                }

                // Ruta actual ya no permitida → /refused.
                // En /refused tras recuperar acceso → home (si no, quedás trabado o el proxy re-evalúa mal).
                if (pathname.startsWith('/refused')) {
                    router.replace('/');
                } else if (!canRenderRoute(pathname, calculatedPermissions, newLicense ?? undefined)) {
                    router.replace('/refused');
                }

                return newProfileContext;
            } catch (err) {
                console.error('Error updating profile context:', err);
            }
        }
        return null;
    };

    const changeCompany = async (company: ICompany) => {
        setCurrentCompany(company);
        localStorage.setItem('currentCompany', JSON.stringify(company));
        localStorage.setItem('previousCompanyId', String(company.id));
        await refreshProfileContext(company.id);
    };

    const includeInactive = true;
    const isSuperAdmin = profileContext
        ? (profileContext.rolesEffective?.includes('superadmin') || false)
        : (user?.roles?.includes('superadmin') || false);
    const isLicenseLocked = isLicenseLockedHelper(companyLicense);

    const hasModule = useCallback((code: TFProductModuleCode) => {
        return hasModuleHelper(companyLicense, code);
    }, [companyLicense]);

    const canAccess = useCallback((rule: ICapabilityRule | TCapabilityKey) => {
        return canAccessHelper(rule, {
            companyLicense,
            userPermissions: permissions,
            isSuperAdmin,
        });
    }, [companyLicense, permissions, isSuperAdmin]);

    const evaluateAccess = useCallback((rule: ICapabilityRule | TCapabilityKey) => {
        return evaluateAccessHelper(rule, {
            companyLicense,
            userPermissions: permissions,
            isSuperAdmin,
        });
    }, [companyLicense, permissions, isSuperAdmin]);

    const userRoles = useMemo(() => {
        return profileContext?.rolesEffective || user?.roles || [];
    }, [profileContext?.rolesEffective, user?.roles]);

    const activeUserRole = useMemo(() => {
        if (isSuperAdmin) return 'superadmin';
        return userRoles[0] || null;
    }, [isSuperAdmin, userRoles]);

    const accessValue = useMemo(() => ({
        companyLicense,
        isLicenseLocked,
        permissions,
        isSuperAdmin,
        effectiveScopes,
        roles: userRoles,
        userRole: activeUserRole,
        hasModule,
        canAccess,
        evaluateAccess,
    }), [companyLicense, isLicenseLocked, permissions, isSuperAdmin, effectiveScopes, userRoles, activeUserRole, hasModule, canAccess, evaluateAccess]);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            mustChangePassword,
            user,
            profileContext,
            companyLicense,
            isLicenseLocked,
            token,
            login,
            changePassword,
            logout,
            loading,
            companies,
            currentCompany,
            changeCompany,
            refreshProfileContext,
            permissions,
            effectiveScopes,
            includeInactive,
            isSuperAdmin,
            hasModule,
            canAccess,
            evaluateAccess,
        }}>
            <AccessProvider value={accessValue}>
                {children}
            </AccessProvider>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
