import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code   = searchParams.get("code");
  const userId = searchParams.get("state"); // pasamos userId como state en la URL de autorización
  const baseUrl     = process.env.NEXT_PUBLIC_SITE_URL  ?? "https://cercaya-gamma.vercel.app";
  const appId       = process.env.MP_APP_ID             ?? "8456203604743632";
  const clientSecret = process.env.MP_CLIENT_SECRET     ?? "";

  if (!code || !userId) {
    return NextResponse.redirect(`${baseUrl}/perfil?mp=error`);
  }

  try {
    const params = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     appId,
      client_secret: clientSecret,
      code,
      redirect_uri:  `${baseUrl}/api/mp/callback`,
    });

    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("MP OAuth token error:", await res.text());
      return NextResponse.redirect(`${baseUrl}/perfil?mp=error`);
    }

    const data = await res.json() as {
      access_token:  string;
      refresh_token: string;
      user_id:       number;
    };

    await supabaseAdmin
      .from("profiles")
      .update({
        mp_access_token:  data.access_token,
        mp_refresh_token: data.refresh_token,
        mp_user_id:       data.user_id,
      })
      .eq("id", userId);

    return NextResponse.redirect(`${baseUrl}/perfil?mp=ok`);
  } catch (err) {
    console.error("MP callback error:", err);
    return NextResponse.redirect(`${baseUrl}/perfil?mp=error`);
  }
}
