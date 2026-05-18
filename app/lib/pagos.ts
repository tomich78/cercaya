/**
 * Constantes de pagos compartidas entre el servidor (API routes) y el cliente.
 * Este archivo NO debe importar nada de servidor (no supabase admin, no _auth, etc.)
 */

export const PRECIOS = {
  destacar_7:   2500,
  destacar_30:  7500,
  negocio_mes:  5000,
  banner_7:     8000,
} as const;

export type TipoPago = keyof typeof PRECIOS;
export type Precios  = { [K in TipoPago]: number };

export const LABELS: Record<TipoPago, string> = {
  destacar_7:   "Publicación destacada — 7 días",
  destacar_30:  "Publicación destacada — 30 días",
  negocio_mes:  "Modo Negocio — 1 mes",
  banner_7:     "Banner publicitario — 7 días",
};

/** Lee los precios actuales desde la DB; cae en los valores por defecto si falla. */
export async function getPreciosDB(): Promise<Precios> {
  try {
    const { supabase } = await import("./supabase");
    const { data } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", Object.keys(PRECIOS));
    if (data && data.length > 0) {
      const out: Record<string, number> = { ...PRECIOS };
      for (const row of data) {
        if (row.key in out) out[row.key as string] = Number(row.value);
      }
      return out as Precios;
    }
  } catch { /* fallback */ }
  return { ...PRECIOS };
}
