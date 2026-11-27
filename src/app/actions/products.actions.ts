"use server";

import { productsService } from "@repo/erp-services/product_services/products.service";
import { updateTag } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidateProducts() {
    if (!(await requireAuthToken())) return;
    updateTag("products");
}

export async function getProductFullById(id: string, _token?: string) {
    const token = await requireAuthToken();
    if (!token || !id) return null;
    try {
        return await productsService.getFullById(id, token);
    } catch (error) {
        console.error("Error fetching full product details:", error);
        return null;
    }
}
