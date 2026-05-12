export const STATS = [
  { value: "+5.000",  label: "usuarios activos",       icon: "👥" },
  { value: "+12.000", label: "publicaciones activas",  icon: "📦" },
  { value: "180+",    label: "ciudades y barrios",     icon: "📍" },
  { value: "~8 min",  label: "tiempo promedio en app", icon: "⏱️" },
];

export const PLANS = [
  {
    id:      "destacado",
    name:    "Destacado",
    badge:   null as string | null,
    price:   "$2.999",
    period:  "por publicación / 30 días",
    color:   "#d97706",
    bgColor: "#fef3c7",
    icon:    "⭐",
    desc:    "Hacé que tu publicación aparezca primero en el feed con un borde dorado y badge especial.",
    features: [
      "Posición preferencial en el feed",
      "Badge «Destacado» en la tarjeta",
      "Borde dorado llamativo",
      "30 días de vigencia",
      "Activación inmediata",
    ],
    cta:     "Destacar una publicación",
    ctaLink: null as string | null,
    ctaNote: "Activá desde tu perfil en cualquier publicación",
  },
  {
    id:      "negocio",
    name:    "Negocio Pro",
    badge:   "Más popular" as string | null,
    price:   "$4.999",
    period:  "por mes",
    color:   "var(--green)",
    bgColor: "var(--green-subtle)",
    icon:    "🏪",
    desc:    "Perfil de negocio completo con nombre, categoría, horarios, verificación CUIT y badge especial.",
    features: [
      "Nombre de negocio en todas tus publicaciones",
      "Badge «Negocio» o «✓ Verificado»",
      "Categoría y horarios visibles",
      "Verificación de CUIT",
      "Perfil diferenciado en el feed",
      "Acceso anticipado a nuevas funciones",
    ],
    cta:     "Activar modo Negocio",
    ctaLink: "/perfil" as string | null,
    ctaNote: "Activá desde la sección «Negocio» en tu perfil",
  },
  {
    id:      "banner",
    name:    "Banner Premium",
    badge:   "Para marcas" as string | null,
    price:   "A consultar",
    period:  "según campaña",
    color:   "#7c3aed",
    bgColor: "#ede9fe",
    icon:    "🎯",
    desc:    "Slots publicitarios integrados en el feed de productos, con segmentación por zona y categoría.",
    features: [
      "Slots en el feed cada 4 productos",
      "Segmentación por ciudad o barrio",
      "Segmentación por categoría",
      "Métricas de impresiones y clics",
      "Diseño y copy personalizado",
      "Soporte dedicado",
    ],
    cta:     "Consultar precio",
    ctaLink: null as string | null,
    ctaNote: "Te respondemos en menos de 24 horas",
  },
];

export const HOW_IT_WORKS = [
  {
    step:  "01",
    title: "Elegís tu plan",
    desc:  "Seleccioná la opción que mejor se adapte a tu objetivo: más visibilidad para un producto puntual, un perfil de negocio completo o una campaña de banner.",
  },
  {
    step:  "02",
    title: "Lo activás en minutos",
    desc:  "Los planes Destacado y Negocio Pro se activan directamente desde tu perfil, sin intermediarios. Los banners se coordinan con nuestro equipo.",
  },
  {
    step:  "03",
    title: "Llegás a tu audiencia",
    desc:  "Tus publicaciones o anuncios aparecen frente a compradores reales de tu zona, en el momento en que están buscando activamente.",
  },
];

export const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 500,
  color: "var(--text-3)", marginBottom: 5,
};

export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 13, color: "var(--text)", background: "var(--bg)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
