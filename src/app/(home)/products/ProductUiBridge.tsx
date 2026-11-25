"use client";


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProductUiProvider } from "@repo/product-ui/runtime";
import type { ProductUiRuntimeConfig } from "@repo/product-ui/runtime";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import MetadataFieldsClient from "@/components/metadata/MetadataFieldsClient";
import { ClusterManagerModal } from "@/app/(home)/audiences/components";

export function ProductUiBridge({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const recovery = useRecovery();

    const value = useMemo<ProductUiRuntimeConfig>(
        () => ({
            auth,
            recovery,
            canDo,
            permissions: PERMISSIONS_CONSTANTS,
            recoveryEntities: RECOVERY_ENTITIES as unknown as ProductUiRuntimeConfig["recoveryEntities"],
            slots: {
                MetadataFieldsClient,
                ClusterManagerModal,
            },
        }),
        [auth, recovery]
    );

    return <ProductUiProvider value={value}>{children}</ProductUiProvider>;
}
