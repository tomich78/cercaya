import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Genera un code_verifier aleatorio (RFC 7636) */
function generateCodeVerifier(): string {
  return randomBytes(64)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 128);
}

/** SHA-256 del verifier en base64url (RFC 7636 S256) */
function generateCodeChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

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

  const baseUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cercaya-gamma.vercel.app";
  const appId       = process.env.MP_APP_ID            ?? "861893684920466";
  const redirectUri = `${baseUrl}/api/mp/callback`;

  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl =
    `https://auth.mercadopago.com/authorization` +
    `?client_id=${appId}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${userId}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  const response = NextResponse.redirect(authUrl);

  // Guardamos el verifier en cookie httpOnly para usarlo en el callback
  response.cookies.set("mp_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutos
    path: "/",
  });

  return response;
}
