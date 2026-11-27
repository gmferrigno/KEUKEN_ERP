"use server";

import { updateTag } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidateConsignments() {
    if (!(await requireAuthToken())) return;
    updateTag("consignments");
}
