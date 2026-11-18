'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * companyId en query string con estado local optimista.
 * Evita que el SelectBox se limpie mientras `router.replace` aún no refleja el param.
 */
export function useCompanyQueryParam() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlCompanyId = searchParams.get('companyId');

    const [companyId, setCompanyIdState] = useState<string | null>(urlCompanyId);

    useEffect(() => {
        setCompanyIdState(urlCompanyId);
    }, [urlCompanyId]);

    const setCompanyId = useCallback(
        (nextId: string | null) => {
            setCompanyIdState(nextId);

            const params = new URLSearchParams(searchParams.toString());
            if (nextId) {
                params.set('companyId', nextId);
            } else {
                params.delete('companyId');
            }
            const qs = params.toString();
            const nextUrl = qs ? `${pathname}?${qs}` : pathname;
            router.replace(nextUrl, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    return { companyId, setCompanyId };
}
