import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, unauthorized } from "../_auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

  const body   = await req.json().catch(() => ({}));
  const code   = ((body as Record<string, unknown>).code as string)?.trim().toUpperCase();
  const userId = (body as Record<string, unknown>).userId as string;

  if (!code || !userId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  if (authUser.id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 1 · Buscar código activo
  const { data: promo } = await supabaseAdmin
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (!promo) {
    return NextResponse.json({ error: "Código inválido o no encontrado" }, { status: 400 });
  }

  // 2 · Verificar vencimiento
  if (promo.expires_at && new Date(promo.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Este código ya venció" }, { status: 400 });
  }

  // 3 · Verificar límite de usos
  if (promo.max_uses !== null && (promo.uses as number) >= (promo.max_uses as number)) {
    return NextResponse.json({ error: "Este código ya alcanzó su límite de usos" }, { status: 400 });
  }

  // 4 · Verificar que el usuario no lo haya usado antes
  const { data: alreadyUsed } = await supabaseAdmin
    .from("promo_code_uses")
    .select("id")
    .eq("code", code)
    .eq("user_id", userId)
    .maybeSingle();

  if (alreadyUsed) {
    return NextResponse.json({ error: "Ya usaste este código anteriormente" }, { status: 400 });
  }

  // 5 · Activar Modo Negocio
  const durationDays = (promo.duration_days as number) ?? 30;
  const until = new Date(Date.now() + durationDays * 86_400_000).toISOString();

  await supabaseAdmin
    .from("profiles")
    .update({
      is_business:         true,
      business_paid:       true,
      business_paid_until: until,
    })
    .eq("id", userId);

  // 6 · Registrar uso
  await supabaseAdmin
    .from("promo_code_uses")
    .insert({ code, user_id: userId });

  // 7 · Incrementar contador
  await supabaseAdmin
    .from("promo_codes")
    .update({ uses: (promo.uses as number) + 1 })
    .eq("code", code);

  return NextResponse.json({
    ok: true,
    message: `¡Código activado! Modo Negocio activo por ${durationDays} días.`,
    durationDays,
  });
}
