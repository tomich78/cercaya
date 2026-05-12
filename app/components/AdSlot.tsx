"use client";
import Link from "next/link";

/**
 * AdSlot — placeholder de publicidad en el grid de productos.
 * Mismo tamaño que ProductCard, se inserta cada N productos.
 */
export default function AdSlot() {
  return (
    <Link
      href="/anunciar"
      style={{ textDecoration: "none", display: "block" }}
      title="Ver planes de publicidad"
    >
      <div style={{
        background: "linear-gradient(145deg, #0f2944 0%, #1e3a5f 60%, #0d2233 100%)",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #2d5a8e",
        cursor: "pointer",
        transition: "border-color 0.12s, transform 0.12s",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "#4a90d9";
          el.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "#2d5a8e";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* Body */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 16px 16px", textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, marginBottom: 10,
          }}>
            🎯
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 5, letterSpacing: -0.2 }}>
            Tu publicidad aquí
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.55, marginBottom: 14 }}>
            Llegá a miles de compradores<br />de tu zona
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: "#60a5fa",
            background: "rgba(96,165,250,0.12)",
            padding: "5px 14px", borderRadius: 20,
            border: "1px solid rgba(96,165,250,0.25)",
            display: "inline-block",
          }}>
            Consultá precios →
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "7px 12px",
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase" as const }}>
            Publicidad
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
            EstamosCerca.com.ar
          </span>
        </div>
      </div>
    </Link>
  );
}
