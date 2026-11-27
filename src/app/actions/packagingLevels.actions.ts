"use server";

import { packagingLevelService } from "@repo/erp-services/product_services/packagingLevel.service";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function getCachedPackagingLevels(_ignoredToken?: string) {
    const token = await requireAuthToken();
    if (!token) return [];

    try {
        return await packagingLevelService.getAll(token);
    } catch (error) {
        console.error("Error fetching cached packaging levels:", error);
        return [];
    }
}
