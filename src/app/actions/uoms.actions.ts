"use server";

import { updateTag } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidateUoms() {
    if (!(await requireAuthToken())) return;
    updateTag("uoms");
}
