import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";
import { getAuthUser, unauthorized } from "../_auth";

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

/** Marca como disabled:true todos los mensajes payment_link del vendedor */
async function disableSellerPaymentLinks(sellerId: string) {
  const { data: msgs } = await supabaseAdmin
    .from("messages")
    .select("id, metadata")
    .eq("sender_id", sellerId)
    .eq("type", "payment_link");

  if (!msgs || msgs.length === 0) return;

  await Promise.all(
    msgs.map(m =>
      supabaseAdmin
        .from("messages")
        .update({ metadata: { ...(m.metadata as Record<string, unknown>), disabled: true } })
        .eq("id", m.id),
    ),
  );
}

// DELETE /api/mp/connect?userId=xxx  →  desvincula la cuenta MP
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Solo puede desvincularse a sí mismo
  if (authUser.id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await supabaseAdmin
    .from("profiles")
    .update({ mp_access_token: null, mp_refresh_token: null, mp_user_id: null })
    .eq("id", userId);

  await disableSellerPaymentLinks(userId);

  return NextResponse.json({ ok: true });
}

/**
 * POST /api/mp/connect — genera la URL de autorización de MP y la devuelve al cliente.
 * El cliente hace fetch con JWT, obtiene la URL y navega a ella.
 * Esto nos permite verificar la autenticación antes de iniciar el flujo OAuth.
 */
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const userId = (body as Record<string, unknown>).userId as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Solo puede iniciar el OAuth para sí mismo
  if (authUser.id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const baseUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cercaya-gamma.vercel.app";
  const appId       = process.env.MP_APP_ID!;
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

  // Devolver la URL y setear la cookie del verifier en la misma response
  const response = NextResponse.json({ authUrl });
  response.cookies.set("mp_code_verifier", codeVerifier, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600,
    path:     "/",
  });

  return response;
}
