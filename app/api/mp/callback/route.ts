import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code   = searchParams.get("code");
  const userId = searchParams.get("state"); // pasamos userId como state en la URL de autorización
  const baseUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? "https://estamoscerca.com.ar";
  const appId        = process.env.MP_APP_ID ?? "861893684920466";
  const clientSecret = process.env.MP_CLIENT_SECRET ?? "";

  if (!code || !userId) {
    return NextResponse.redirect(`${baseUrl}/perfil?mp=error`);
  }

  // Leer el code_verifier guardado en la cookie por /api/mp/connect
  const codeVerifier = req.cookies.get("mp_code_verifier")?.value;
  console.log("MP callback — code_verifier present:", !!codeVerifier);

  const redirect = (path: string) => {
    const res = NextResponse.redirect(`${baseUrl}${path}`);
    res.cookies.delete("mp_code_verifier");
    return res;
  };

  try {
    const params = new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/mp/callback`,
    });

    // PKCE: incluir code_verifier si existe
    if (codeVerifier) params.set("code_verifier", codeVerifier);

    // Credenciales via Basic Auth header (RFC 6749 §2.3.1)
    const basicAuth = Buffer.from(`${appId}:${clientSecret ?? ""}`).toString("base64");

    console.log("MP token exchange — usando Basic Auth header, has_verifier:", !!codeVerifier);

    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Accept":        "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error("MP OAuth token error:", responseText);
      return redirect("/perfil?mp=error");
    }

    const data = JSON.parse(responseText) as {
      access_token:  string;
      refresh_token: string;
      user_id:       number;
    };

    // Si el vendedor tenía una cuenta MP distinta, deshabilitar sus links viejos
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("mp_user_id")
      .eq("id", userId)
      .single();

    const previousMpUserId = profile?.mp_user_id;
    if (previousMpUserId && previousMpUserId !== data.user_id) {
      await disableSellerPaymentLinks(userId);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        mp_access_token:  data.access_token,
        mp_refresh_token: data.refresh_token,
        mp_user_id:       data.user_id,
      })
      .eq("id", userId);

    return redirect("/perfil?mp=ok");
  } catch (err) {
    console.error("MP callback error:", err);
    return redirect("/perfil?mp=error");
  }
}
