import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const dni  = ((body as Record<string, unknown>).dni as string)?.trim();

  if (!dni || !/^\d{7,8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("dni_number", dni)
    .maybeSingle();

  if (data) {
    return NextResponse.json({ available: false, error: "Ese DNI ya tiene una cuenta registrada" });
  }

  return NextResponse.json({ available: true });
}
