"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getBusinesses, type LocalBusiness } from "../lib/storage";
import { usePageTitle } from "../lib/usePageTitle";

function BusinessCard({ biz }: { biz: LocalBusiness }) {
  const initials = biz.businessName.slice(0, 2).toUpperCase();
  return (
    <Link
      href={`/negocio/${biz.businessSlug}`}
      style={{
        display: "block", textDecoration: "none",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, overflow: "hidden", transition: "border-color 0.12s, box-shadow 0.12s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--green-subtle)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Portada */}
      <div style={{ height: 76, background: biz.coverUrl ? "transparent" : "var(--green-subtle)", overflow: "hidden" }}>
        {biz.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={biz.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      <div style={{ padding: "0 14px 14px", marginTop: -24 }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--green-subtle)", border: "3px solid var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", marginBottom: 8,
        }}>
          {biz.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={biz.avatarUrl} alt={biz.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>{initials}</span>
          )}
        </div>

        {/* Nombre + verificado */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {biz.businessName}
          </span>
          {biz.cuitVerified && (
            <span title="Negocio verificado" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--green)", padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>✓</span>
          )}
        </div>

        {/* Rubro + ubicación */}
        <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {biz.businessCategory && <span>📦 {biz.businessCategory}</span>}
          {biz.location && <span>📍 {biz.location}</span>}
        </div>

        {/* Descripción */}
        {biz.businessDesc && (
          <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
            {biz.businessDesc}
          </p>
        )}

        <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
          {biz.productCount} publicación{biz.productCount !== 1 ? "es" : ""} activa{biz.productCount !== 1 ? "s" : ""} →
        </div>
      </div>
    </Link>
  );
}

function NegociosInner() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<LocalBusiness[] | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("Todos");
  usePageTitle("Negocios");

  useEffect(() => { getBusinesses().then(setBusinesses); }, []);

  const loading = businesses === null;
  const all = businesses ?? [];

  // Rubros presentes (solo los que tienen negocios)
  const categories = useMemo(() => {
    const set = new Set<string>();
    all.forEach(b => { if (b.businessCategory) set.add(b.businessCategory); });
    return ["Todos", ...Array.from(set).sort()];
  }, [all]);

  const filtered = all.filter(b => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || b.businessName.toLowerCase().includes(q)
      || b.businessCategory?.toLowerCase().includes(q)
      || b.businessDesc?.toLowerCase().includes(q)
      || b.location?.toLowerCase().includes(q);
    const matchCat = category === "Todos" || b.businessCategory === category;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6, margin: "0 0 4px" }}>
            🏪 Negocios
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            Descubrí los comercios y emprendimientos de tu zona.
          </p>
        </div>

        {/* Buscador */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "9px 14px", marginBottom: 14,
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <path d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.3 10.01C8.54 10.64 7.56 11 6.5 11C4.02 11 2 8.98 2 6.5C2 4.02 4.02 2 6.5 2C8.98 2 11 4.02 11 6.5C11 7.56 10.64 8.54 10.01 9.3L12.85 12.15C13.05 12.34 13.05 12.66 12.85 12.85C12.66 13.05 12.34 13.05 12.15 12.85L9.3 10.01Z" fill="#aaa" fillRule="evenodd" clipRule="evenodd" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar negocios por nombre, rubro o zona…"
            style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 17, padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Filtro por rubro */}
        {categories.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: "5px 13px", borderRadius: 999, border: "1px solid",
                  borderColor: category === cat ? "var(--green)" : "var(--border)",
                  background:  category === cat ? "var(--green)" : "var(--surface)",
                  color:       category === cat ? "#fff" : "var(--text-2)",
                  fontWeight:  category === cat ? 700 : 400,
                  fontSize: 12, cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Contador */}
        <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, marginBottom: 14 }}>
          {loading ? "Cargando…" : `${filtered.length} negocio${filtered.length !== 1 ? "s" : ""}`}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="business-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div className="skeleton" style={{ height: 76 }} />
                <div style={{ padding: 14 }}>
                  <div className="skeleton" style={{ height: 48, width: 48, borderRadius: "50%", marginTop: -24, marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 11, width: "40%", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {all.length === 0 ? "Todavía no hay negocios" : "Sin resultados"}
            </div>
            <div style={{ fontSize: 12 }}>
              {all.length === 0 ? "Sé el primero en activar tu página de negocio." : "Probá con otro término o rubro."}
            </div>
          </div>
        ) : (
          <div className="business-grid">
            {filtered.map(b => <BusinessCard key={b.id} biz={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NegociosPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <NegociosInner />
    </Suspense>
  );
}
