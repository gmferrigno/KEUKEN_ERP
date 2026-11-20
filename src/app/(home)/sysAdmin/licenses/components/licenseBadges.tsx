'use client';

import { IFLicenseContract } from '@repo/api-contracts/erp';
import type { SysAdminBadgeTone } from '../../components/sysAdminChrome';
import { LICENSE_STATUS_LABELS, LICENSE_WARNING_LABELS } from '../../lib/constants';

interface LicenseBadgesProps {
    license: IFLicenseContract | null;
}

function DotStatus({
    label,
    tone,
}: {
    label: string;
    tone: SysAdminBadgeTone;
}) {
    const dotClass =
        tone === 'ok'
            ? 'bg-success'
            : tone === 'warn'
              ? 'bg-warning'
              : tone === 'error'
                ? 'bg-error'
                : tone === 'info'
                  ? 'bg-info'
                  : 'bg-main/30';

    return (
        <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="text-xs text-main font-medium">{label}</span>
        </div>
    );
}

export default function LicenseBadges({ license }: LicenseBadgesProps) {
    if (!license) {
        return <DotStatus label="Sin licencia" tone="error" />;
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DotStatus
                label={LICENSE_STATUS_LABELS[license.status] || license.status}
                tone={statusTone}
            />
            {license.warning && warningTone ? (
                <DotStatus
                    label={LICENSE_WARNING_LABELS[license.warning] || license.warning}
                    tone={warningTone}
                />
            ) : null}
            {license.lockout ? <DotStatus label="Candado activo" tone="error" /> : null}
            <DotStatus label={`Plan: ${license.plan}`} tone="info" />
        </div>
    );
}
