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

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return NextResponse.json({ isAdmin: false });

  const action = new URL(req.url).searchParams.get("action");

  // GET /api/admin?action=users  →  lista de usuarios (bypasa RLS)
  if (action === "users") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Admin users query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ users: data ?? [] });
  }

  // GET /api/admin?action=promo_codes  →  lista de códigos promo (bypasa RLS)
  if (action === "promo_codes") {
    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .select("code, note, uses, max_uses, duration_days, expires_at, active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Admin promo_codes query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ codes: data ?? [] });
  }

  return NextResponse.json({ isAdmin: true });
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
      case "delete_user": {
        // 1. Mensajes enviados por el usuario (en cualquier conversación)
        await supabaseAdmin.from("messages").delete().eq("sender_id", userId);

        // 2. Mensajes en conversaciones donde el usuario es comprador o vendedor
        const { data: convos } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
        if (convos && convos.length > 0) {
          const ids = convos.map((c: { id: number }) => c.id);
          await supabaseAdmin.from("messages").delete().in("conversation_id", ids);
        }

        // 3. Conversaciones donde participa
        await supabaseAdmin
          .from("conversations")
          .delete()
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

        // 4. Reviews dadas o recibidas (la tabla usa seller_id para el revisado)
        await supabaseAdmin
          .from("reviews")
          .delete()
          .or(`reviewer_id.eq.${userId},seller_id.eq.${userId}`);

        // 5. Usos de códigos promocionales
        await supabaseAdmin.from("promo_code_uses").delete().eq("user_id", userId);

        // 6. Banners
        await supabaseAdmin.from("banners").delete().eq("user_id", userId);

        // 7. Publicaciones
        await supabaseAdmin.from("products").delete().eq("user_id", userId);

        // 8. Perfil
        await supabaseAdmin.from("profiles").delete().eq("id", userId);

        // 9. Usuario de auth (último paso)
        await supabaseAdmin.auth.admin.deleteUser(userId);

        return NextResponse.json({ ok: true });
      }

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
          uses:          0,
          active:        true,
        });
        if (error) {
          console.error("create_promo_code error:", error);
          if (error.code === "23505") {
            return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
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
