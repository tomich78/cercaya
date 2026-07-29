import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que la página sea incrustada en iframes de otros dominios (clickjacking)
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  // Evita que el browser "adivine" el tipo de contenido
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Controla cuánta info de referencia se envía
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Deshabilita características del browser que no usamos
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  // Fuerza HTTPS en producción (1 año)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy — permite Supabase, Mercado Pago, Georef y CDNs usados
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: solo mismo origen + inline necesario para Next.js
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com",
      // Estilos
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: mismo origen + Supabase Storage + cualquier https
      "img-src 'self' data: blob: https:",
      // Fuentes
      "font-src 'self' data:",
      // Conexiones XHR/fetch/WebSocket
      [
        "connect-src 'self'",
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.mercadopago.com",
        "https://auth.mercadopago.com",
        "https://apis.datos.gob.ar",
      ].filter(Boolean).join(" "),
      // Frames: Mercado Pago usa iframes en su SDK de pago
      "frame-src 'self' https://www.mercadopago.com https://secure.mlstatic.com",
      // Media
      "media-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
