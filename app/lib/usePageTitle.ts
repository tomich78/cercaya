import { useEffect } from "react";

/**
 * Establece el título de la pestaña del navegador.
 * Uso: usePageTitle("Nombre del producto") → "Nombre del producto — EstamosCerca"
 * Si `title` está vacío, usa el título por defecto.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const base = "EstamosCerca";
    document.title = title ? `${title} — ${base}` : `${base} — Compra y vende cerca tuyo`;
    return () => {
      document.title = `${base} — Compra y vende cerca tuyo`;
    };
  }, [title]);
}
