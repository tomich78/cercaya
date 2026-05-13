import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// Precios en ARS
export const PRECIOS = {
  destacar_7:   2500,   // destacar publicación 7 días
  destacar_30:  7500,   // destacar publicación 30 días
  negocio_mes:  5000,   // modo negocio mensual
  banner_7:     8000,   // banner 7 días
};

export type TipoPago = keyof typeof PRECIOS;

const LABELS: Record<TipoPago, string> = {
  destacar_7:   "Publicación destacada — 7 días",
  destacar_30:  "Publicación destacada — 30 días",
  negocio_mes:  "Modo Negocio — 1 mes",
  banner_7:     "Banner publicitario — 7 días",
};

export async function POST(req: NextRequest) {
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
