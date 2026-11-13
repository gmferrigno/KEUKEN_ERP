"use client";
import React from "react";
import { useRecovery } from "@/contexts/RecoveryContext";

interface SectionHeaderProps {
    title: string;
    children?: React.ReactNode;
    actionIcon?: string;
    onAction?: () => void;
    actionAriaLabel?: string;
    actionClassName?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    children,
    actionIcon,
    onAction,
    actionAriaLabel = "Acción",
    actionClassName = "",
}) => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();

    return (
        <div className="p-2 px-3 flex flex-col gap-2 w-full border-b border-focus-500/35 bg-linear-to-r from-primary-500 to-primary-900/80 rounded-dx shadow-xs">
            <div className="flex items-center justify-between gap-2">
                <div className="w-full min-w-0">
                    <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                        <div className="text-xl">{title}</div>
                        {isRecoveryMode && (
                            <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-focus-500/10 border-focus-500/30 text-focus-300 text-[11px] font-medium select-none"
                                title={
                                    recoveryVisibility === "all"
                                        ? "Modo recuperación activo · mostrando activos y borrados"
                                        : "Modo recuperación activo · mostrando solo borrados"
                                }
                            >
                                <i className="dx-icon-trash text-xs text-focus-300" />
                                Modo recuperación
                                <span className="opacity-80">
                                    · {recoveryVisibility === "all" ? "Todos" : "Borrados"}
                                </span>
                            </span>
                        )}
                    </div>
                    {children && <div className="mt-2 w-full">{children}</div>}
                </div>
                {actionIcon && (
                    <button
                        className={`bg-focus-500 rounded-dx w-10 h-10 flex items-center justify-center shrink-0 ${actionClassName}`}
                        onClick={onAction}
                        aria-label={actionAriaLabel}
                    >
                        <img
                            src={actionIcon}
                            alt=""
                            className="w-6 h-6"
                            style={{ filter: "invert(1)" }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SectionHeader;
