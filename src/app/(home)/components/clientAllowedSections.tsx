'use client';

import { useAuth } from "@/contexts/AuthContext";
import { getFirstLevelRoutes, IAppRoute } from "@/app/lib/routes/getRoutes";
import { canRenderRoute } from "@repo/access";
import SectionContainer from "./section/sectionContainer";
import { useEffect, useState } from "react";

export function SectionsFallback() {
    return (
        <div className="bg-primary-500/40 backdrop-blur-xl border border-main/5 rounded-dx p-6 shadow-md w-full h-full animate-pulse">
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-normal text-main">Secciones</span>
                <div className="w-6 h-6 bg-main/10 rounded" />
            </div>
            <div className="border-b border-main/40 mb-4" />
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-20 bg-main/5 rounded-dx border border-main/10 animate-pulse" />
                ))}
            </div>
        </div>
    );
}

export default function ClientAllowedSections() {
    const { effectiveScopes, loading, companyLicense } = useAuth();
    const [allowedRoutes, setAllowedRoutes] = useState<IAppRoute[] | null>(null);

    useEffect(() => {
        if (!loading) {
            const userPermissions = effectiveScopes;
            const routes = getFirstLevelRoutes().filter(route => {
                return canRenderRoute(route.path, userPermissions, companyLicense);
            });
            setAllowedRoutes(routes);
        }
    }, [effectiveScopes, loading, companyLicense]);

    if (loading || allowedRoutes === null) {
        return <SectionsFallback />;
    }

    return (
        <SectionContainer
            title="Secciones"
            items={allowedRoutes}
            iconRight={<i className="dx-icon dx-icon-edit" />}
            childrenClassName="grid grid-cols-3 gap-4"
        />
    );
}
