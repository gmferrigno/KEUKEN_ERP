'use client';

import { type ReactNode } from 'react';
import { getLicenseGraceUiState, useAccess } from '@repo/access';
import { LicenseGraceStatus } from '@repo/custom-components';

export default function LicenseGraceStatusClient({ children }: { children: ReactNode }) {
    const { companyLicense, isLicenseLocked } = useAccess();
    const graceState = getLicenseGraceUiState(companyLicense);
    const graceDays =
        companyLicense && 'graceDays' in companyLicense ? companyLicense.graceDays : undefined;

    return (
        <LicenseGraceStatus
            isLocked={Boolean(isLicenseLocked)}
            state={{ ...graceState, graceDays }}
        >
            {children}
        </LicenseGraceStatus>
    );
}
