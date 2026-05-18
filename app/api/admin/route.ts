import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, unauthorized } from "../_auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ADMIN_EMAIL debe ser una variable sin NEXT_PUBLIC_ para que no se filtre al cliente
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const user = await getAuthUser(req);
  if (!user) return false;
  return user.email === ADMIN_EMAIL;
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return unauthorized();
  }

  const body = await req.json();
  const { action, userId, productId, precios } = body;

  try {
    switch (action) {

      // ── Negocios ──────────────────────────────────────────────
      case "cancel_business":
        await supabaseAdmin.from("profiles").update({
          is_business:         false,
          business_paid:       false,
          business_paid_until: null,
        }).eq("id", userId);
        return NextResponse.json({ ok: true });

      case "activate_business":
        await supabaseAdmin.from("profiles").update({
          is_business:   true,
          business_paid: true,
          business_paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        }).eq("id", userId);
        return NextResponse.json({ ok: true });

      // ── Destacados ────────────────────────────────────────────
      case "unfeature_product":
        await supabaseAdmin.from("products").update({
          featured:       false,
          featured_until: null,
        }).eq("id", productId);
        return NextResponse.json({ ok: true });

      case "feature_product":
        await supabaseAdmin.from("products").update({
          featured:       true,
          featured_until: new Date(Date.now() + 7 * 86400000).toISOString(),
        }).eq("id", productId);
        return NextResponse.json({ ok: true });

      // ── Banners ───────────────────────────────────────────────
      case "deactivate_banner":
        await supabaseAdmin.from("banners").update({ active: false }).eq("id", productId);
        return NextResponse.json({ ok: true });

      // ── Usuarios ──────────────────────────────────────────────
      case "delete_user":
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ ok: true });

      // ── Códigos promocionales ────────────────────────────────
      case "create_promo_code": {
        const p = (body.promoCode ?? {}) as {
          code: string; note?: string; maxUses?: number | null;
          durationDays?: number; expiresAt?: string | null;
        };
        if (!p.code?.trim()) {
          return NextResponse.json({ error: "Falta el código" }, { status: 400 });
        }
        const { error } = await supabaseAdmin.from("promo_codes").insert({
          code:          p.code.trim().toUpperCase(),
          note:          p.note?.trim() || null,
          max_uses:      p.maxUses ?? null,
          duration_days: p.durationDays ?? 30,
          expires_at:    p.expiresAt   || null,
          type:          "negocio_mes",
          uses:          0,
          active:        true,
        });
        if (error) {
          if (error.code === "23505") {
            return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
          }
          throw error;
        }
        return NextResponse.json({ ok: true });
      }

      case "deactivate_promo_code": {
        await supabaseAdmin
          .from("promo_codes")
          .update({ active: false })
          .eq("code", body.code);
        return NextResponse.json({ ok: true });
      }

      case "reactivate_promo_code": {
        await supabaseAdmin
          .from("promo_codes")
          .update({ active: true })
          .eq("code", body.code);
        return NextResponse.json({ ok: true });
      }

      case "delete_promo_code": {
        await supabaseAdmin.from("promo_code_uses").delete().eq("code", body.code);
        await supabaseAdmin.from("promo_codes").delete().eq("code", body.code);
        return NextResponse.json({ ok: true });
      }

      // ── Precios ───────────────────────────────────────────────
      case "update_precios": {
        const entries = Object.entries(precios as Record<string, number>);
        await Promise.all(
          entries.map(([key, value]) =>
            supabaseAdmin
              .from("app_config")
              .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
          )
        );
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }
  } catch (err) {
    console.error("Admin action error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
