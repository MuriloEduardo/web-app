"use server";

import { bffPost } from "@/app/lib/bff/fetcher";

export async function sendMetaOutbound(payload: unknown) {
    return await bffPost("/api/meta/outbound", payload);
}
