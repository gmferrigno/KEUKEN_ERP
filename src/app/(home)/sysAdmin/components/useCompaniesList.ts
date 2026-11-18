'use client';

import { useEffect, useState } from 'react';
import { IFCompany } from '@repo/api-contracts/erp';
import { companiesService } from '@repo/erp-services/companies.service';
import { useAuth } from '@/contexts/AuthContext';
import notify from 'devextreme/ui/notify';

export function useCompaniesList() {
    const { token } = useAuth();
    const [companies, setCompanies] = useState<IFCompany[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (!token) return;

        setLoading(true);
        companiesService
            .getAll({ limit: 5000, offset: 0 }, token)
            .then((res) => {
                if (mounted) setCompanies(res.items || []);
            })
            .catch((err) => {
                console.error('Error al cargar compañías:', err);
                notify(
                    err instanceof Error ? err.message : 'No se pudieron cargar las compañías',
                    'error',
                    3000
                );
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [token]);

    return { companies, loading };
}
