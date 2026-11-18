'use client';

import { ReactNode } from 'react';

/** Panel de contenido SysAdmin — tokens @repo/ui (primary / main / rounded-dx). */
export function SysAdminPanel({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`bg-primary-900 rounded-dx border border-main/10 shadow-lg relative overflow-hidden ${className}`}
        >
            {children}
        </div>
    );
}

export function SysAdminPanelHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b border-main/10 bg-primary-500/40">
            <div className="min-w-0">
                <h3 className="text-base font-semibold text-main">{title}</h3>
                {description ? (
                    <div className="text-xs text-main/55 mt-0.5 leading-relaxed">{description}</div>
                ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
    );
}

export function SysAdminPanelBody({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

export function SysAdminToolbar({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-dx bg-primary-900/60 border border-main/10">
            {children}
        </div>
    );
}

export function SysAdminEmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: string;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="h-full w-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center animate-fade-in transition-all">
            <div className="w-24 h-24 bg-focus-500/5 rounded-full flex items-center justify-center mb-6 border border-focus-500/10 shadow-sm relative">
                <i className={`dx-icon-${icon} !text-5xl !text-focus-500/70 absolute`} />
                <div className="w-full h-full rounded-full border-2 border-focus-500/10" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-main">{title}</h3>
            <p className="text-main/60 max-w-sm mx-auto leading-relaxed text-sm">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

export function SysAdminLoadingState({ label }: { label: string }) {
    return (
        <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 p-8">
            <div className="w-10 h-10 rounded-dx bg-focus-500/10 border border-focus-500/20 animate-pulse" />
            <p className="text-sm text-main/55">{label}</p>
        </div>
    );
}

export function SysAdminMetaGrid({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    );
}

export function SysAdminMetaField({
    label,
    children,
    className = '',
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-dx bg-primary-950/40 border border-main/5 px-3 py-2 ${className}`}>
            <span className="block text-[11px] uppercase tracking-wide text-main/45 mb-1">{label}</span>
            <div className="text-sm text-main break-words leading-snug">{children}</div>
        </div>
    );
}

export function SysAdminInlineCode({ children }: { children: ReactNode }) {
    return (
        <code className="px-1 py-0.5 rounded-dx bg-focus-500/10 text-focus-300 text-[11px] font-mono">
            {children}
        </code>
    );
}

export type SysAdminBadgeTone = 'neutral' | 'ok' | 'warn' | 'error' | 'info';

/** Badge con tokens de status del theme system (success / warning / error / info). */
export function SysAdminBadge({
    label,
    tone = 'neutral',
}: {
    label: string;
    tone?: SysAdminBadgeTone;
}) {
    const toneClass =
        tone === 'ok'
            ? 'bg-success/15 text-success border-success/30'
            : tone === 'warn'
              ? 'bg-warning/15 text-warning border-warning/30'
              : tone === 'error'
                ? 'bg-error/15 text-error border-error/30'
                : tone === 'info'
                  ? 'bg-info/15 text-info border-info/30'
                  : 'bg-main/10 text-main/80 border-main/20';

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-dx border text-[11px] font-medium select-none ${toneClass}`}
        >
            {label}
        </span>
    );
}
