"use server";

import { revalidatePath } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidateListTypes() {
    if (!(await requireAuthToken())) return;
    revalidatePath("/priceLists/listTypes");
}
