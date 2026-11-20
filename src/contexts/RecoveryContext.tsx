'use client';

import '@/lib/erp-api-client.setup';
import { RecoveryProvider as BaseRecoveryProvider } from '@repo/recovery';
import { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export function RecoveryProvider({ children }: { children: ReactNode }) {
    const { isSuperAdmin, effectiveScopes } = useAuth();

    return (
        <BaseRecoveryProvider isSuperAdmin={isSuperAdmin} effectiveScopes={effectiveScopes}>
            {children}
        </BaseRecoveryProvider>
    );
}
