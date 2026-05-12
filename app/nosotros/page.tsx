"use client";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { usePageTitle } from "../lib/usePageTitle";

// Fotos de Unsplash — libres de uso
const PHOTOS = {
  hero:      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
  exchange:  "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
  delivery:  "https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?auto=format&fit=crop&w=800&q=80",
  neighbors: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
};

const STATS = [
  { value: "+5.000", label: "usuarios activos" },
  { value: "+12.000", label: "publicaciones" },
  { value: "180+", label: "ciudades y barrios" },
  { value: "4.8 ★", label: "calificación promedio" },
];

const VALUES = [
  {
    icon: "🤝",
    title: "Confianza",
    desc: "Verificamos identidades y habilitamos reseñas reales para que cada transacción sea segura.",
  },
  {
    icon: "📍",
    title: "Cercanía",
    desc: "Conectamos personas del mismo barrio o ciudad. Sin envíos caros ni esperas eternas.",
  },
  {
    icon: "♻️",
    title: "Economía circular",
    desc: "Darle una segunda vida a lo que ya no usás es bueno para el bolsillo y para el planeta.",
  },
  {
    icon: "💬",
    title: "Trato directo",
    desc: "Sin intermediarios. Comprador y vendedor se hablan directo y cierran el trato como entre vecinos.",
  },
];

export default function NosotrosPage() {
  usePageTitle("Nosotros");

  return (
    <div>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTOS.hero}
          alt="Personas intercambiando productos"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Overlay degradado */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
          display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "0 1.5rem" }}>
            <div style={{ maxWidth: 460 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 10 }}>
                Nuestra historia
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: -1, lineHeight: 1.15 }}>
                El mercado de tu barrio, en tu celular
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.7 }}>
                Nacimos para que comprar y vender cerca tuyo sea tan fácil como hablarle a un vecino.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* ── Historia ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 64 }} className="about-grid">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 10 }}>
              Cómo empezó todo
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 16px", lineHeight: 1.25 }}>
              Cansados de pagar envíos por cosas que están a diez cuadras
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, margin: "0 0 14px" }}>
              EstamosCerca nació de una frustración cotidiana: publicabas algo en las grandes plataformas y el
              interesado estaba a la vuelta de tu casa, pero igual terminabas coordinando envíos, pagando
              comisiones y esperando días.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, margin: 0 }}>
              Creamos una alternativa pensada para Argentina, donde el trato cercano y la confianza entre
              personas del mismo barrio son la base de cada transacción.
            </p>
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PHOTOS.exchange}
              alt="Persona recibiendo un paquete"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--green)", borderRadius: 12,
          padding: "2rem 2.5rem", marginBottom: 64,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        }} className="stats-grid">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                textAlign: "center", padding: "0.5rem 1rem",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.8 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Misión (imagen + texto invertido) ────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 64 }} className="about-grid">
          <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PHOTOS.delivery}
              alt="Entrega de producto entre vecinos"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 10 }}>
              Nuestra misión
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 16px", lineHeight: 1.25 }}>
              Hacer que cada barrio tenga su propio mercado
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, margin: "0 0 14px" }}>
              Queremos que cualquier persona pueda vender lo que ya no usa, encontrar lo que necesita
              a precio justo y hacerlo todo con la confianza de saber con quién está hablando.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, margin: 0 }}>
              Cada publicación es una oportunidad de darle una segunda vida a un objeto y fortalecer
              la economía del barrio.
            </p>
          </div>
        </div>

        {/* ── Valores ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>
              Lo que nos mueve
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
              Nuestros valores
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="values-grid">
            {VALUES.map(v => (
              <div key={v.title} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "1.25rem",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{v.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, letterSpacing: -0.3 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Foto cierre ──────────────────────────────────────────── */}
        <div style={{ borderRadius: 12, overflow: "hidden", height: 280, marginBottom: 56, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTOS.neighbors}
            alt="Encuentro entre vecinos"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                Somos vecinos ayudando a vecinos
              </div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                Más de 5.000 personas ya forman parte de la comunidad
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA final ────────────────────────────────────────────── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "2rem",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, margin: "0 0 10px" }}>
            ¿Querés ser parte?
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 24px", lineHeight: 1.6 }}>
            Publicar es gratis y lleva menos de dos minutos.<br />
            Tu próximo comprador puede estar a la vuelta de la esquina.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/publicar" style={{
              background: "var(--green)", color: "#fff",
              borderRadius: 6, padding: "10px 24px",
              fontSize: 13, fontWeight: 600, display: "inline-block",
            }}>
              Publicar gratis →
            </Link>
            <Link href="/" style={{
              background: "var(--surface)", color: "var(--text-2)",
              border: "1px solid var(--border)",
              borderRadius: 6, padding: "10px 24px",
              fontSize: 13, fontWeight: 500, display: "inline-block",
            }}>
              Explorar productos
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
