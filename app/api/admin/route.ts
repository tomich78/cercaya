import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;

// Verificar que el request viene del admin
async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("x-admin-email");
  return authHeader === ADMIN_EMAIL;
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { action, userId, productId } = body;

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

      default:
        return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }
  } catch (err) {
    console.error("Admin action error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
