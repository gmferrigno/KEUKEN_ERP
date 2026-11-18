'use client';

import { IFLicenseContract } from '@repo/api-contracts/erp';
import { SysAdminBadge, type SysAdminBadgeTone } from '../../components/sysAdminChrome';
import { LICENSE_STATUS_LABELS, LICENSE_WARNING_LABELS } from '../../lib/constants';

interface LicenseBadgesProps {
    license: IFLicenseContract | null;
}

export default function LicenseBadges({ license }: LicenseBadgesProps) {
    if (!license) {
        return <SysAdminBadge label="Sin licencia" tone="error" />;
    }

    const statusTone: SysAdminBadgeTone =
        license.status === 'active'
            ? 'ok'
            : license.status === 'expired' || license.status === 'revoked'
              ? 'error'
              : 'neutral';

    const warningTone: SysAdminBadgeTone | null =
        license.warning === 'in_grace' || license.warning === 'expiring_soon'
            ? 'warn'
            : license.warning === 'grace_ended' || license.warning === 'not_yet_valid'
              ? 'error'
              : null;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <SysAdminBadge
                label={LICENSE_STATUS_LABELS[license.status] || license.status}
                tone={statusTone}
            />
            {license.warning && warningTone && (
                <SysAdminBadge
                    label={LICENSE_WARNING_LABELS[license.warning] || license.warning}
                    tone={warningTone}
                />
            )}
            {license.lockout && <SysAdminBadge label="Candado activo" tone="error" />}
            <SysAdminBadge label={`Plan: ${license.plan}`} tone="info" />
        </div>
    );
}
