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

export const LABELS: Record<TipoPago, string> = {
  destacar_7:   "Publicación destacada — 7 días",
  destacar_30:  "Publicación destacada — 30 días",
  negocio_mes:  "Modo Negocio — 1 mes",
  banner_7:     "Banner publicitario — 7 días",
};
