import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, unauthorized } from "../../_auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  // Verificar que el usuario esté autenticado
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

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

    // Solo el comprador puede crear un link de pago para sí mismo
    if (authUser.id !== buyerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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

    const client     = new MercadoPagoConfig({ accessToken: seller.mp_access_token });
    const preference = new Preference(client);
    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://estamoscerca.com.ar";

    const result = await preference.create({
      body: {
        items: [{
          id:          String(productId),
          title,
          quantity:    1,
          unit_price:  amount,
          currency_id: "ARS",
        }],
        metadata: {
          tipo:            "pago_producto",
          seller_id:       sellerId,
          buyer_id:        buyerId,
          product_id:      productId,
          conversation_id: conversationId,
        },
        back_urls: {
          success: `${baseUrl}/pago/exito?tipo=pago_producto`,
          failure: `${baseUrl}/pago/error`,
          pending: `${baseUrl}/pago/pendiente`,
        },
        auto_return: "approved",
      },
    });

    return NextResponse.json({
      initPoint:    result.init_point,
      preferenceId: result.id,
    });
  } catch (err) {
    console.error("MP producto preference error:", err);
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 });
  }
}
