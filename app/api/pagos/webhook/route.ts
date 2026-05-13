import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// Cliente con service role para poder actualizar sin RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP manda distintos tipos de notificaciones
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Obtener detalle del pago
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const meta      = payment.metadata as Record<string, unknown>;
    const tipo      = meta?.tipo      as string | undefined;
    const userId    = meta?.user_id   as string | undefined;
    const productId = meta?.product_id as number | undefined;

    if (!tipo || !userId) return NextResponse.json({ ok: true });

    // ── Procesar según tipo ────────────────────────────────────────
    if (tipo === "destacar_7" || tipo === "destacar_30") {
      const dias = tipo === "destacar_7" ? 7 : 30;
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + dias);

      await supabaseAdmin
        .from("products")
        .update({
          featured:       true,
          featured_until: hasta.toISOString(),
        })
        .eq("id", productId);
    }

    if (tipo === "negocio_mes") {
      const hasta = new Date();
      hasta.setMonth(hasta.getMonth() + 1);

      await supabaseAdmin
        .from("profiles")
        .update({
          is_business:         true,
          business_paid:       true,
          business_paid_until: hasta.toISOString(),
        })
        .eq("id", userId);
    }

    if (tipo === "banner_7") {
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 7);

      await supabaseAdmin
        .from("banners")
        .insert({
          user_id:   userId,
          active:    true,
          valid_until: hasta.toISOString(),
          payment_id: String(paymentId),
        });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
