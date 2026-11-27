"use server";

import { updateTag } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidatePresentations() {
    if (!(await requireAuthToken())) return;
    updateTag("presentations");
}
