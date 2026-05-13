export const STATS = [
  { value: "100%",   label: "gratuito publicar",       icon: "🎁" },
  { value: "$0",     label: "comisiones por venta",    icon: "✅" },
  { value: "🇦🇷",    label: "hecho en Argentina",      icon: "" },
  { value: "2025",   label: "año de lanzamiento",      icon: "🚀" },
];

export const HOW_IT_WORKS = [
  {
    step:  "01",
    title: "Elegís tu plan",
    desc:  "Seleccioná la opción que mejor se adapte: más visibilidad para un producto puntual, un perfil de negocio completo, o un banner en el feed.",
  },
  {
    step:  "02",
    title: "Pagás con Mercado Pago",
    desc:  "El pago se procesa de forma segura con tarjeta, débito o saldo de Mercado Pago. Se activa de forma automática e inmediata.",
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
