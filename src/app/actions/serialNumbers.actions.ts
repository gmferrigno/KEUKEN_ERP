"use server";

import { updateTag } from "next/cache";
import { requireAuthToken } from "@/lib/server/requireAuth";

export async function revalidateSerialNumbers() {
    if (!(await requireAuthToken())) return;
    updateTag("serial-numbers");
}
