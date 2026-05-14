import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role para poder actualizar sin RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Helper: obtener pago con un token dado ─────────────────────

async function fetchPayment(paymentId: string, token: string) {
  const cfg = new MercadoPagoConfig({ accessToken: token });
  return new Payment(cfg).get({ id: paymentId });
}

// ── Webhook ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = String(body.data?.id ?? "");
    if (!paymentId) return NextResponse.json({ ok: true });

    // Intentar con token de plataforma primero.
    // Si el pago es de un vendedor con OAuth, fallará → buscar por mp_user_id.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payment: any = null;

    try {
      payment = await fetchPayment(paymentId, process.env.MP_ACCESS_TOKEN!);
    } catch {
      const mpUserId = body.user_id as number | undefined;
      if (mpUserId) {
        const { data: seller } = await supabaseAdmin
          .from("profiles")
          .select("mp_access_token")
          .eq("mp_user_id", mpUserId)
          .single();

        if (seller?.mp_access_token) {
          try {
            payment = await fetchPayment(paymentId, seller.mp_access_token as string);
          } catch {
            return NextResponse.json({ ok: true });
          }
        }
      }
    }

    if (!payment || payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const meta      = payment.metadata as Record<string, unknown>;
    const tipo      = meta?.tipo       as string | undefined;
    const userId    = meta?.user_id    as string | undefined;
    const productId = meta?.product_id as number | undefined;

    if (!tipo) return NextResponse.json({ ok: true });

    // ── destacar_7 / destacar_30 ──────────────────────────────
    if (tipo === "destacar_7" || tipo === "destacar_30") {
      const dias  = tipo === "destacar_7" ? 7 : 30;
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + dias);
      await supabaseAdmin
        .from("products")
        .update({ featured: true, featured_until: hasta.toISOString() })
        .eq("id", productId);
    }

    // ── negocio_mes ───────────────────────────────────────────
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

    // ── banner_7 ──────────────────────────────────────────────
    if (tipo === "banner_7") {
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 7);
      await supabaseAdmin
        .from("banners")
        .insert({
          user_id:     userId,
          active:      true,
          valid_until: hasta.toISOString(),
          payment_id:  String(paymentId),
        });
    }

    // ── pago_producto ─────────────────────────────────────────
    if (tipo === "pago_producto") {
      const buyerId        = meta?.buyer_id        as string | undefined;
      const conversationId = meta?.conversation_id as number | undefined;
      const amount         = payment.transaction_amount as number | undefined;

      // Marcar producto como vendido
      if (productId) {
        await supabaseAdmin
          .from("products")
          .update({ sold: true })
          .eq("id", productId);
      }

      // Enviar mensaje de confirmación automático en el chat
      if (conversationId && buyerId) {
        const amountStr = amount
          ? `$${amount.toLocaleString("es-AR")}`
          : "el monto acordado";

        await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id:       buyerId,
            sender_initials: "✅",
            text:            `Pago de ${amountStr} confirmado`,
            type:            "payment_confirmed",
            metadata:        { amount, paymentId: String(paymentId) },
          });

        await supabaseAdmin
          .from("conversations")
          .update({
            last_message:    "✅ Pago confirmado",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
