'use client';

import {
    loginAction,
    logoutAction,
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
import { ICompany, IFProfileContext, IFUser } from "@repo/api-contracts/erp";
import { companiesService } from '@repo/erp-services/userContext/companies.service';
import { getToken } from '@/lib/utils/token.helper';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    user: IFUser | null;
    profileContext: IFProfileContext | null;
    companyLicense: TFMeLicenseField | null;
    isLicenseLocked: boolean;
    token: string;
    permissions: TFPermissionsConfig | undefined;
    effectiveScopes: string[];
    login: (email: string, password: string) => Promise<void>;
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
    const [user, setUser] = useState<any | null>(null);
    const [profileContext, setProfileContext] = useState<IFProfileContext | null>(null);
    const [companyLicense, setCompanyLicense] = useState<TFMeLicenseField | null>(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<ICompany[]>([]);
    const [currentCompany, setCurrentCompany] = useState<ICompany | null>(null);
    const [permissions, setPermissions] = useState<TFPermissionsConfig>();
    const [effectiveScopes, setEffectiveScopes] = useState<string[]>([]);

    const [token, setToken] = useState<string>('');

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const storedToken = getToken();
        const userData = localStorage.getItem('userData');
        const savedProfileContext = localStorage.getItem('profileContext');
        const savedCompanyLicense = localStorage.getItem('companyLicense');
        const savedCompanies = localStorage.getItem('companies');
        const savedCurrentCompany = localStorage.getItem('currentCompany');

        // Sin authToken en LS la sesión no puede restaurarse tras un remount (p.ej. /refused, 404).
        if (storedToken && userData) {
            setIsAuthenticated(true);
            setToken(storedToken);
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            let calculatedPermissions = parsedUser.roles || [];

            if (savedProfileContext) {
                try {
                    const parsedProfileContext: IFProfileContext = JSON.parse(savedProfileContext);
                    setProfileContext(parsedProfileContext);
                    calculatedPermissions = Array.from(new Set([
                        ...(parsedProfileContext.rolesEffective || []),
                        ...(parsedProfileContext.scopesEffective || []),
                    ]));

                    if (parsedProfileContext.license && !savedCompanyLicense) {
                        setCompanyLicense(parsedProfileContext.license);
                    }
                } catch (e) {
                    console.error('Error parsing stored profileContext:', e);
                }
            }

            if (savedCompanyLicense) {
                try {
                    setCompanyLicense(JSON.parse(savedCompanyLicense));
                } catch (e) {
                    console.error('Error parsing stored companyLicense:', e);
                }
            }

            setEffectiveScopes(calculatedPermissions);
            setPermissions(mapPermissionsToFrontend(calculatedPermissions));

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
    }, []);

    // Guard de sesión client-side: no expulsar en login/refused (páginas de acceso/denegación).
    useEffect(() => {
        if (loading) return;
        const isExemptPath =
            pathname.startsWith('/login') ||
            pathname.startsWith('/refused');
        if (!isAuthenticated && !isExemptPath) {
            router.replace('/login');
        }
    }, [isAuthenticated, loading, pathname, router]);

    const login = async (loginInput: string, passwordInput: string) => {
        try {
            const result = await loginAction(loginInput, passwordInput);
            if (!result.success || !result.token || !result.user) {
                throw new Error(result.error || 'Login failed');
            }

            const authToken = result.token;
            const authUser = result.user;
            const initialProfileContext = result.profileContext;

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
                    updateCompanyLicenseCookieAction(activeLicense).catch(console.error);
                }

                const calculatedPermissions = Array.from(new Set([
                    ...(fetchedProfileContext.rolesEffective || []),
                    ...(fetchedProfileContext.scopesEffective || []),
                ]));
                setEffectiveScopes(calculatedPermissions);
                setPermissions(mapPermissionsToFrontend(calculatedPermissions));

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
                setUser(authUser);
                localStorage.setItem('userData', JSON.stringify(authUser));
            }

            localStorage.setItem('authToken', authToken);
            setIsAuthenticated(true);
            setToken(authToken);
            router.push('/');
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        // Guardar la empresa actual como previousCompanyId antes de cerrar sesión
        if (currentCompany?.id) {
            localStorage.setItem('previousCompanyId', String(currentCompany.id));
        }

        await logoutAction();
        setIsAuthenticated(false);
        setUser(null);
        setProfileContext(null);
        setCompanyLicense(null);
        setToken('');
        setPermissions(undefined);
        setEffectiveScopes([]);
        setCompanies([]);
        setCurrentCompany(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('profileContext');
        localStorage.removeItem('companyLicense');
        localStorage.removeItem('companies');
        localStorage.removeItem('currentCompany');
        router.push('/login');
    };

    const refreshProfileContext = async (companyId?: string, branchId?: string): Promise<IFProfileContext | null> => {
        const targetCompanyId = companyId || currentCompany?.id;
        if (token && targetCompanyId) {
            try {
                const newProfileContext = await authService.getProfileContext(token, targetCompanyId, branchId);
                setProfileContext(newProfileContext);
                localStorage.setItem('profileContext', JSON.stringify(newProfileContext));

                // Actualizar la licencia de la nueva empresa
                const newLicense = newProfileContext.license || null;
                setCompanyLicense(newLicense);
                if (newLicense) {
                    localStorage.setItem('companyLicense', JSON.stringify(newLicense));
                } else {
                    localStorage.removeItem('companyLicense');
                }

                const calculatedPermissions = Array.from(new Set([
                    ...(newProfileContext.rolesEffective || []),
                    ...(newProfileContext.scopesEffective || []),
                ]));
                setEffectiveScopes(calculatedPermissions);
                setPermissions(mapPermissionsToFrontend(calculatedPermissions));

                // Await cookies before any navigation/soft-refresh so proxy sees the new company context.
                await Promise.all([
                    updateCompanyLicenseCookieAction(newLicense).catch((err) => {
                        console.error('Error updating companyLicense cookie on refresh:', err);
                    }),
                    updatePermissionsCookieAction(calculatedPermissions).catch((err) => {
                        console.error('Error updating permissions cookie on refresh:', err);
                    }),
                ]);

                if (user) {
                    const updatedUser = { ...user, roles: newProfileContext.rolesEffective || [] };
                    setUser(updatedUser);
                    localStorage.setItem('userData', JSON.stringify(updatedUser));
                }

                // If the current route is no longer allowed for this company, leave the page.
                if (!canRenderRoute(pathname, calculatedPermissions, newLicense ?? undefined)) {
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
            user,
            profileContext,
            companyLicense,
            isLicenseLocked,
            token,
            login,
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
