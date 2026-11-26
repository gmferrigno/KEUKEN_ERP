"use client";

import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRecovery } from "@repo/recovery";
import { UsersUiProvider } from "@repo/domain-ui/users/runtime";
import type { UsersUiRuntimeConfig } from "@repo/domain-ui/users/runtime";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

export function UsersUiBridge({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const recovery = useRecovery();

    const value = useMemo<UsersUiRuntimeConfig>(
        () => ({
            auth,
            recovery,
            canDo,
            permissions: PERMISSIONS_CONSTANTS,
        }),
        [auth, recovery]
    );

    return <UsersUiProvider value={value}>{children}</UsersUiProvider>;
}
