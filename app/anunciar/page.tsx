"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import BotonPago from "../components/BotonPago";
import { usePageTitle } from "../lib/usePageTitle";
import { getCurrentUser, type LocalUser } from "../lib/auth";
import { getLocalProducts, type LocalProduct } from "../lib/storage";
import { PRECIOS } from "../lib/pagos";
import { STATS, HOW_IT_WORKS } from "./data";

export default function AnunciarPage() {
  usePageTitle("Anunciar");
  const router = useRouter();

  const [user,     setUser]     = useState<LocalUser | null>(null);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Para el selector de producto en "Destacado"
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [showPicker,      setShowPicker]       = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) {
        const prods = await getLocalProducts();
        setProducts(prods.filter(p => p.userId === u.id && !p.sold));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <Navbar />

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)",
        padding: "4rem 1.5rem", textAlign: "center",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(26,171,130,0.15)", border: "1px solid rgba(26,171,130,0.3)",
            borderRadius: 999, padding: "4px 14px",
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            color: "#1aab82", textTransform: "uppercase", marginBottom: 16,
          }}>
            🎯 Publicidad en EstamosCerca
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: -1, lineHeight: 1.15, margin: "0 0 14px" }}>
            Llegá a compradores reales<br />de tu zona
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: "0 0 28px", lineHeight: 1.7 }}>
            Destacá tus productos, creá tu perfil de negocio o publicá un banner.<br />
            Todo se activa de inmediato y se paga con Mercado Pago.
          </p>
          <a href="#planes" style={{
            background: "#1aab82", color: "#fff",
            borderRadius: 6, padding: "10px 24px",
            fontSize: 13, fontWeight: 600, display: "inline-block", textDecoration: "none",
          }}>
            Ver planes →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 56 }} className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem", textAlign: "center" }}>
              {s.icon && <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>}
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Planes ── */}
        <div id="planes" style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>
              Opciones de visibilidad
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 8px" }}>
              Planes para cada necesidad
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>
              Pagás con Mercado Pago y se activa de inmediato.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="plans-grid">

            {/* ── Plan Destacado ── */}
            <PlanCard
              badge={null}
              icon="⭐"
              name="Destacado"
              color="#d97706"
              bgColor="#fef3c7"
              borderColor="#f59e0b"
              features={[
                "Posición preferencial en el feed",
                "Badge ⭐ en la tarjeta",
                "Activación inmediata",
              ]}
            >
              {loading ? (
                <div style={{ height: 38 }} />
              ) : !user ? (
                <button onClick={() => router.push("/login?redirect=/anunciar")} style={ctaStyle("#d97706", false)}>
                  Iniciar sesión para destacar
                </button>
              ) : products.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "8px 0" }}>
                  Publicá un producto primero para poder destacarlo.{" "}
                  <Link href="/publicar" style={{ color: "var(--green)" }}>Publicar →</Link>
                </div>
              ) : !showPicker ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Elegí duración:</div>
                  </div>
                  <button onClick={() => setShowPicker(true)} style={ctaStyle("#d97706", false)}>
                    Destacar publicación →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 2 }}>
                    ¿Cuál publicación querés destacar?
                  </div>
                  <select
                    value={selectedProduct ?? ""}
                    onChange={e => setSelectedProduct(Number(e.target.value))}
                    style={{
                      width: "100%", padding: "7px 10px",
                      border: "1px solid var(--border)", borderRadius: 6,
                      fontSize: 13, background: "var(--bg)", color: "var(--text)",
                      outline: "none",
                    }}
                  >
                    <option value="">— Seleccioná —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.title} · {p.price}
                        {p.featured ? " ⭐ (ya destacado)" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <BotonPago
                        tipo="destacar_7"
                        userId={user.id}
                        productId={selectedProduct}
                        label="Destacar 7 días"
                        descripcion="Pago único"
                        precio={PRECIOS.destacar_7}
                        style={{ background: "linear-gradient(90deg,#f59e0b,#d97706)", fontSize: "12px" } as React.CSSProperties}
                      />
                      <BotonPago
                        tipo="destacar_30"
                        userId={user.id}
                        productId={selectedProduct}
                        label="Destacar 30 días"
                        descripcion="Mejor valor"
                        precio={PRECIOS.destacar_30}
                        style={{ background: "linear-gradient(90deg,#b45309,#92400e)", fontSize: "12px" } as React.CSSProperties}
                      />
                    </div>
                  )}
                  <button onClick={() => { setShowPicker(false); setSelectedProduct(null); }} style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}>
                    ← Cancelar
                  </button>
                </div>
              )}
            </PlanCard>

            {/* ── Plan Negocio ── */}
            <PlanCard
              badge="Más popular"
              badgeColor="var(--green)"
              icon="🏪"
              name="Negocio Pro"
              color="var(--green)"
              bgColor="var(--green-subtle)"
              borderColor="var(--green)"
              features={[
                "Nombre de negocio en tus publicaciones",
                "Badge «Negocio» o «✓ Verificado»",
                "Categoría y horarios visibles",
                "Verificación de CUIT",
                "Perfil diferenciado en el feed",
              ]}
            >
              {loading ? (
                <div style={{ height: 38 }} />
              ) : !user ? (
                <button onClick={() => router.push("/login?redirect=/anunciar")} style={ctaStyle("var(--green)", true)}>
                  Iniciar sesión para activar
                </button>
              ) : user.isBusiness && user.businessPaid ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, marginBottom: 6 }}>✓ Ya tenés Modo Negocio activo</div>
                  <Link href="/perfil" style={{ fontSize: 12, color: "var(--text-3)" }}>Ir a tu perfil →</Link>
                </div>
              ) : (
                <BotonPago
                  tipo="negocio_mes"
                  userId={user.id}
                  label="Activar Modo Negocio"
                  descripcion="1 mes · Renovable"
                  precio={PRECIOS.negocio_mes}
                />
              )}
            </PlanCard>

            {/* ── Plan Banner ── */}
            <PlanCard
              badge="Para marcas"
              badgeColor="#7c3aed"
              icon="🎯"
              name="Banner Premium"
              color="#7c3aed"
              bgColor="#ede9fe"
              borderColor="#7c3aed"
              features={[
                "Slots en el feed cada 4 productos",
                "Segmentación por ciudad o barrio",
                "Segmentación por categoría",
                "Métricas de impresiones y clics",
                "7 días de vigencia",
              ]}
            >
              {loading ? (
                <div style={{ height: 38 }} />
              ) : !user ? (
                <button onClick={() => router.push("/login?redirect=/anunciar")} style={ctaStyle("#7c3aed", false)}>
                  Iniciar sesión para anunciar
                </button>
              ) : (
                <BotonPago
                  tipo="banner_7"
                  userId={user.id}
                  label="Publicar banner 7 días"
                  descripcion="Pago único · Activo de inmediato"
                  precio={PRECIOS.banner_7}
                  style={{ background: "linear-gradient(90deg,#7c3aed,#6d28d9)" } as React.CSSProperties}
                />
              )}
            </PlanCard>

          </div>
        </div>

        {/* ── Cómo funciona ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>Proceso</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Cómo funciona</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="howto-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--border)", letterSpacing: -1, lineHeight: 1, marginBottom: 12 }}>{step.step}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Componente PlanCard ────────────────────────────────────────────────────────

interface PlanCardProps {
  badge?: string | null;
  badgeColor?: string;
  icon: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  children: React.ReactNode;
}

function PlanCard({ badge, badgeColor, icon, name, color, bgColor, borderColor, features, children }: PlanCardProps) {
  const priceMap: Record<string, { price: string; period: string; desc: string }> = {
    "Destacado":     { price: `$${(2500).toLocaleString("es-AR")}`, period: "por 7 días", desc: "Hacé que tu publicación aparezca primero en el feed con badge especial." },
    "Negocio Pro":   { price: `$${(5000).toLocaleString("es-AR")}`, period: "por mes",    desc: "Perfil de negocio completo con nombre, categoría, horarios y verificación CUIT." },
    "Banner Premium":{ price: `$${(8000).toLocaleString("es-AR")}`, period: "por 7 días", desc: "Slots publicitarios integrados en el feed, con segmentación por zona y categoría." },
  };
  const info = priceMap[name];

  return (
    <div style={{
      background: "var(--surface)",
      border: badge ? `2px solid ${borderColor}` : "1px solid var(--border)",
      boxShadow: badge ? `0 0 0 4px ${bgColor}` : "none",
      borderRadius: 10, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {badge && (
        <div style={{ background: badgeColor, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center", padding: "5px 0" }}>
          {badge}
        </div>
      )}
      <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bgColor, borderRadius: 6, padding: "5px 10px", marginBottom: 14, alignSelf: "flex-start" }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{name}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2 }}>{info?.price}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>{info?.period}</div>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 16px" }}>{info?.desc}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 7 }}>
          {features.map(f => (
            <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: "var(--text-2)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="7" cy="7" r="7" fill={color} opacity="0.15"/>
                <polyline points="4,7 6,9 10,5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ctaStyle(color: string, filled: boolean): React.CSSProperties {
  return {
    display: "block", width: "100%", textAlign: "center",
    padding: "9px", borderRadius: 6,
    background: filled ? color : "var(--bg)",
    color: filled ? "#fff" : "var(--text-2)",
    border: filled ? "none" : "1px solid var(--border)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    boxSizing: "border-box",
  };
}
