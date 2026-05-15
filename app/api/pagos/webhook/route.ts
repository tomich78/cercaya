import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

// Cliente con service role para poder actualizar sin RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Verificación de firma MP ───────────────────────────────────
/**
 * Mercado Pago firma los webhooks con HMAC-SHA256.
 * Header: x-signature: ts=<timestamp>,v1=<hmac>
 * Mensaje firmado: id:<payment_id>;request-id:<x-request-id>;ts:<timestamp>;
 * Doc: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
function verifyMpSignature(req: NextRequest, paymentId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Si no está configurado el secret, omitir verificación (desarrollo)
  if (!secret) return true;

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  const tsMatch = xSignature.match(/ts=([^,]+)/);
  const v1Match = xSignature.match(/v1=([^,]+)/);
  if (!tsMatch || !v1Match) return false;

  const ts      = tsMatch[1];
  const v1      = v1Match[1];
  const message = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;

  const expected = createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return expected === v1;
}

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

    // Verificar firma HMAC de Mercado Pago
    if (!verifyMpSignature(req, paymentId)) {
      console.warn("MP webhook: firma inválida");
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

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

      // Manejar stock: decrementar y solo marcar como vendido cuando llega a 0
      let stockRemaining = 0;
      if (productId) {
        const { data: prod } = await supabaseAdmin
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();

        const currentStock = (prod?.stock as number | null) ?? 1;
        const newStock = Math.max(0, currentStock - 1);
        stockRemaining = newStock;

        if (newStock <= 0) {
          // Sin más stock → marcar como vendido
          await supabaseAdmin
            .from("products")
            .update({ sold: true, stock: 0 })
            .eq("id", productId);
        } else {
          // Quedan unidades → solo decrementar
          await supabaseAdmin
            .from("products")
            .update({ stock: newStock })
            .eq("id", productId);
        }
      }

      // Enviar mensaje de confirmación automático en el chat
      if (conversationId && buyerId) {
        const amountStr = amount
          ? `$${amount.toLocaleString("es-AR")}`
          : "el monto acordado";

        const stockNote = stockRemaining > 0
          ? ` · Quedan ${stockRemaining} unidad${stockRemaining !== 1 ? "es" : ""}`
          : "";

        await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id:       buyerId,
            sender_initials: "✅",
            text:            `Pago de ${amountStr} confirmado${stockNote}`,
            type:            "payment_confirmed",
            metadata:        { amount, paymentId: String(paymentId), stockRemaining },
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
