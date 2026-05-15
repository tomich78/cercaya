import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getAuthUser, unauthorized } from "../../_auth";
import { PRECIOS, LABELS, type TipoPago } from "../../../lib/pagos";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  // Verificar que el usuario esté autenticado
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { tipo, userId, productId } = body as {
      tipo: TipoPago;
      userId: string;
      productId?: number;
    };

    if (!tipo || !userId || !(tipo in PRECIOS)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    // Solo puede crear preferencias para sí mismo
    if (authUser.id !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cercaya-gamma.vercel.app";

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id:          tipo,
            title:       LABELS[tipo],
            quantity:    1,
            unit_price:  PRECIOS[tipo],
            currency_id: "ARS",
          },
        ],
        metadata: {
          tipo,
          user_id:    userId,
          product_id: productId ?? null,
        },
        back_urls: {
          success: `${baseUrl}/pago/exito?tipo=${tipo}&userId=${userId}${productId ? `&productId=${productId}` : ""}`,
          failure: `${baseUrl}/pago/error`,
          pending: `${baseUrl}/pago/pendiente`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/pagos/webhook`,
      },
    });

    return NextResponse.json({ preferenceId: result.id, initPoint: result.init_point });
  } catch (err) {
    console.error("MP preferencia error:", err);
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 });
  }
}
