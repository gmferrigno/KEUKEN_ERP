"use client";

import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileUiProvider } from "@repo/profile-ui/runtime";
import type { ProfileUiRuntimeConfig } from "@repo/profile-ui/runtime";

export function ProfileUiBridge({ children }: { children: ReactNode }) {
    const auth = useAuth();

    const value = useMemo<ProfileUiRuntimeConfig>(
        () => ({
            auth,
        }),
        [auth]
    );

    return <ProfileUiProvider value={value}>{children}</ProfileUiProvider>;
}
