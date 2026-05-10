// ── Distancia Haversine ───────────────────────────────────────

/**
 * Calcula la distancia en km entre dos pares de coordenadas usando la fórmula de Haversine.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6371; // radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formatea una distancia en km para mostrar al usuario.
 * Ej: 0.4 → "400 m" | 2.3 → "2.3 km" | 15.7 → "16 km"
 */
export function formatDistance(km: number): string {
  if (km < 1)   return `${Math.round(km * 1000)} m`;
  if (km < 10)  return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
