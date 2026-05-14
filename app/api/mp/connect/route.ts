import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// DELETE /api/mp/connect?userId=xxx  →  desvincula la cuenta MP
export async function DELETE(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await supabaseAdmin
    .from("profiles")
    .update({ mp_access_token: null, mp_refresh_token: null, mp_user_id: null })
    .eq("id", userId);

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cercaya-gamma.vercel.app";
  const appId   = process.env.MP_APP_ID           ?? "8456203604743632";
  const redirectUri = `${baseUrl}/api/mp/callback`;

  const authUrl =
    `https://auth.mercadopago.com/authorization` +
    `?client_id=${appId}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${userId}`;

  return NextResponse.redirect(authUrl);
}
