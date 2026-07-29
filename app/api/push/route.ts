import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role para leer suscripciones de cualquier usuario
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

webpush.setVapidDetails(
  process.env.VAPID_MAILTO!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface PushPayload {
  userId: string;   // destinatario
  title:  string;
  body:   string;
  url?:   string;   // ruta a abrir al tocar la notificación
}

export async function POST(req: NextRequest) {
  const { userId, title, body, url } = (await req.json()) as PushPayload;

  if (!userId || !title || !body) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  // Traer todas las suscripciones del usuario destinatario
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    // El usuario no tiene suscripciones — no es un error
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url ?? "/" });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone = suscripción inválida/expirada → borrar
        if (err.statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
        throw err;
      }),
    ),
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
