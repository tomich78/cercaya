import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { sellerId, buyerId, productId, conversationId, amount, title } =
      await req.json() as {
        sellerId:       string;
        buyerId:        string;
        productId:      number;
        conversationId: number;
        amount:         number;
        title:          string;
      };

    if (!sellerId || !buyerId || !productId || !conversationId || !amount || !title) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Obtener token MP del vendedor
    const { data: seller } = await supabaseAdmin
      .from("profiles")
      .select("mp_access_token, business_paid")
      .eq("id", sellerId)
      .single();

    if (!seller?.mp_access_token) {
      return NextResponse.json(
        { error: "El vendedor no tiene Mercado Pago vinculado" },
        { status: 400 },
      );
    }

    if (!seller.business_paid) {
      return NextResponse.json(
        { error: "El vendedor no tiene Modo Negocio activo" },
        { status: 403 },
      );
    }

    // TEST: usando token de plataforma para aislar si el problema es el OAuth token
    const client     = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const preference = new Preference(client);
    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL!;

    // DEBUG: preferencia mínima para aislar qué campo causa el error en checkout
    const result = await preference.create({
      body: {
        items: [{
          id:          String(productId),
          title,
          quantity:    1,
          unit_price:  amount,
          currency_id: "ARS",
        }],
      },
    });

    console.log("MP preference created:", { id: result.id, init_point: result.init_point });

    return NextResponse.json({
      initPoint:    result.init_point,
      preferenceId: result.id,
    });
  } catch (err) {
    console.error("MP producto preference error:", err);
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 });
  }
}
