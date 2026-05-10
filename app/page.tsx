"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import ProductCardSkeleton from "./components/ProductCardSkeleton";
import { products, categories } from "./data";
import { getLocalProducts, type LocalProduct } from "./lib/storage";
import { getCurrentUser } from "./lib/auth";
import { haversineKm, formatDistance } from "./lib/geo";

type SortOption = "relevante" | "cercano" | "precio_asc" | "precio_desc" | "reciente";
type Condition  = "Todos" | "Nuevo" | "Usado";
type MaxDist    = "todos" | "5" | "10" | "25" | "50";

const PAGE_SIZE = 12;

function parsePrice(str: string): number {
  return parseInt(str.replace(/[$\s.]/g, ""), 10) || 0;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search,         setSearch]         = useState("");
  const [localProducts,  setLocalProducts]  = useState<LocalProduct[] | null>(null);

  // Filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin,    setPriceMin]    = useState("");
  const [priceMax,    setPriceMax]    = useState("");
  const [condition,   setCondition]   = useState<Condition>("Todos");
  const [sortBy,      setSortBy]      = useState<SortOption>("relevante");
  const [maxDist,     setMaxDist]     = useState<MaxDist>("todos");

  // Ubicación del usuario actual (para distancias)
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Paginación
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef    = useRef<HTMLDivElement>(null);
  // Bloquea el observer mientras se resetea la paginación
  const blockObserver  = useRef(false);
  const blockTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref con el total filtrado para que el observer no incremente de más
  const filteredTotal  = useRef(0);

  useEffect(() => {
    getLocalProducts().then(setLocalProducts);
    getCurrentUser().then(u => {
      if (u?.lat && u?.lng) { setUserLat(u.lat); setUserLng(u.lng); }
    });
  }, []);

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    blockObserver.current = true;
    setVisibleCount(PAGE_SIZE);
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => { blockObserver.current = false; }, 200);
  }, [activeCategory, search, priceMin, priceMax, condition, sortBy, maxDist]);

  // IntersectionObserver para cargar más
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && !blockObserver.current) {
      setVisibleCount(prev => {
        // No incrementar si ya mostramos todo
        if (prev >= filteredTotal.current) return prev;
        return prev + PAGE_SIZE;
      });
    }
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const loading = localProducts === null;
  const hasUserLocation = userLat !== null && userLng !== null;

  // Combinar y deduplicar por ID (Supabase primero, mock data como fallback)
  const baseProducts = (() => {
    const seen = new Set<number>();
    return [...(localProducts ?? []), ...products].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  })();

  // Calcular distancia real para cada producto si el usuario tiene ubicación
  const allProducts = hasUserLocation
    ? baseProducts.map(p => {
        const pLat = (p as LocalProduct).lat;
        const pLng = (p as LocalProduct).lng;
        if (pLat != null && pLng != null) {
          const km = haversineKm(userLat!, userLng!, pLat, pLng);
          return { ...p, distance: formatDistance(km), _km: km };
        }
        return { ...p, _km: Infinity };
      })
    : baseProducts.map(p => ({ ...p, _km: Infinity }));

  // Contar filtros activos (sin contar el sort)
  const activeFilterCount = [
    priceMin  !== "",
    priceMax  !== "",
    condition !== "Todos",
    maxDist   !== "todos",
  ].filter(Boolean).length;

  const filtered = allProducts
    .filter(p => {
      const matchCat    = activeCategory === "Todos" || p.category === activeCategory;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const price       = parsePrice(p.price);
      const matchMin    = !priceMin || price >= parseInt(priceMin.replace(/\D/g, ""));
      const matchMax    = !priceMax || price <= parseInt(priceMax.replace(/\D/g, ""));
      const pCond       = (p as LocalProduct).condition;
      const matchCond   = condition === "Todos" || pCond === condition;
      // Filtro de distancia: solo aplica si el usuario tiene ubicación y el producto también
      const matchDist   = maxDist === "todos" || !hasUserLocation || p._km > 999
        ? true
        : p._km <= parseInt(maxDist);
      return matchCat && matchSearch && matchMin && matchMax && matchCond && matchDist;
    })
    .sort((a, b) => {
      if (sortBy === "cercano")     return a._km - b._km;
      if (sortBy === "precio_asc")  return parsePrice(a.price) - parsePrice(b.price);
      if (sortBy === "precio_desc") return parsePrice(b.price) - parsePrice(a.price);
      if (sortBy === "reciente") {
        const aT = (a as LocalProduct).createdAt ? new Date((a as LocalProduct).createdAt).getTime() : 0;
        const bT = (b as LocalProduct).createdAt ? new Date((b as LocalProduct).createdAt).getTime() : 0;
        return bT - aT;
      }
      return 0;
    });

  function clearFilters() {
    setPriceMin(""); setPriceMax(""); setCondition("Todos"); setSortBy("relevante"); setMaxDist("todos");
  }

  // Sincronizar ref con el total filtrado actual
  filteredTotal.current = filtered.length;

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore         = visibleCount < filtered.length;

  const sortLabels: Record<SortOption, string> = {
    relevante:   "Relevante",
    cercano:     "Más cercano",
    precio_asc:  "Precio ↑",
    precio_desc: "Precio ↓",
    reciente:    "Más reciente",
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Hero */}
        <div style={{
          background: "var(--green)", borderRadius: 8,
          padding: "22px 24px", marginBottom: "1.5rem", color: "#fff",
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.6, marginBottom: 6, letterSpacing: 0.1, display: "flex", alignItems: "center", gap: 6 }}>
            {hasUserLocation ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Tu zona configurada
              </>
            ) : (
              <>Sin ubicación — <a href="/perfil" style={{ color: "#fff", textDecoration: "underline", opacity: 0.85 }}>configurala en tu perfil</a></>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 5px", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Comprá y vendé cerca tuyo
          </h1>
          <p style={{ fontSize: 13, opacity: 0.65, margin: "0 0 16px", lineHeight: 1.5 }}>
            Sin envíos complicados. Solo gente de tu zona.
          </p>
          <div style={{
            background: "var(--surface)", borderRadius: 6,
            padding: "8px 13px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
              <path d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.3 10.01C8.54 10.64 7.56 11 6.5 11C4.02 11 2 8.98 2 6.5C2 4.02 4.02 2 6.5 2C8.98 2 11 4.02 11 6.5C11 7.56 10.64 8.54 10.01 9.3L12.85 12.15C13.05 12.34 13.05 12.66 12.85 12.85C12.66 13.05 12.34 13.05 12.15 12.85L9.3 10.01Z" fill="#aaa" fillRule="evenodd" clipRule="evenodd" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="¿Qué estás buscando?"
              style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent", color: "var(--text)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>
        </div>

        {/* Categorías */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 14px", borderRadius: 999, border: "1px solid",
                borderColor: activeCategory === cat ? "var(--green)" : "var(--border)",
                background:  activeCategory === cat ? "var(--green-subtle)" : "var(--surface)",
                color:       activeCategory === cat ? "var(--green)" : "var(--text-2)",
                fontWeight:  activeCategory === cat ? 600 : 400,
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Barra de filtros */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>

          {/* Botón Filtros */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6, border: "1px solid",
              borderColor: activeFilterCount > 0 ? "var(--green)" : "var(--border)",
              background:  activeFilterCount > 0 ? "var(--green-subtle)" : "var(--surface)",
              color:       activeFilterCount > 0 ? "var(--green)" : "var(--text-2)",
              fontSize: 13, fontWeight: activeFilterCount > 0 ? 600 : 400,
              cursor: "pointer", transition: "all 0.12s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filtros
            {activeFilterCount > 0 && (
              <span style={{
                background: "var(--green)", color: "#fff",
                borderRadius: "50%", width: 16, height: 16,
                fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort pills */}
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: "5px 11px", borderRadius: 6, border: "1px solid",
                  borderColor: sortBy === key ? "var(--green)" : "var(--border)",
                  background:  sortBy === key ? "var(--green-subtle)" : "var(--surface)",
                  color:       sortBy === key ? "var(--green)" : "var(--text-2)",
                  fontWeight:  sortBy === key ? 600 : 400,
                  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel de filtros desplegable */}
        {filtersOpen && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "16px 18px", marginBottom: 14,
            display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end",
          }}>

            {/* Precio */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 }}>
                Precio
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Mínimo"
                  inputMode="numeric"
                  style={{
                    width: 110, padding: "7px 10px", borderRadius: 6,
                    border: "1px solid var(--border)", fontSize: 13,
                    color: "var(--text)", background: "var(--bg)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>
                <input
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value.replace(/\D/g, ""))}
                  placeholder="Máximo"
                  inputMode="numeric"
                  style={{
                    width: 110, padding: "7px 10px", borderRadius: 6,
                    border: "1px solid var(--border)", fontSize: 13,
                    color: "var(--text)", background: "var(--bg)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Condición */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 }}>
                Condición
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["Todos", "Nuevo", "Usado"] as Condition[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    style={{
                      padding: "6px 14px", borderRadius: 6, border: "1px solid",
                      borderColor: condition === c ? "var(--green)" : "var(--border)",
                      background:  condition === c ? "var(--green-subtle)" : "var(--bg)",
                      color:       condition === c ? "var(--green)" : "var(--text-2)",
                      fontWeight:  condition === c ? 600 : 400,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* Distancia */}
            {hasUserLocation && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>
                  Distancia
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["todos", "5", "10", "25", "50"] as MaxDist[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setMaxDist(d)}
                      style={{
                        padding: "6px 14px", borderRadius: 6, border: "1px solid",
                        borderColor: maxDist === d ? "var(--green)" : "var(--border)",
                        background:  maxDist === d ? "var(--green-subtle)" : "var(--bg)",
                        color:       maxDist === d ? "var(--green)" : "var(--text-2)",
                        fontWeight:  maxDist === d ? 600 : 400,
                        fontSize: 13, cursor: "pointer",
                      }}
                    >{d === "todos" ? "Todos" : `${d} km`}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Limpiar */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 13,
                  background: "none", border: "1px solid var(--border)",
                  color: "var(--text-3)", cursor: "pointer",
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Results header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
            {loading ? "Cargando…" : `${filtered.length} publicaciones`}
          </div>
          {activeFilterCount > 0 && !loading && (
            <button
              onClick={clearFilters}
              style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
            : visibleProducts.map(({ _km: _ignored, ...p }) => <ProductCard key={p.id} product={p} />)
          }
        </div>

        {/* Sin resultados */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--text-3)" }}>
            <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Sin resultados</div>
            <div style={{ fontSize: 12 }}>
              {activeFilterCount > 0 ? "Probá ajustando los filtros." : "Intentá con otro término o categoría."}
            </div>
          </div>
        )}

        {/* Sentinel siempre montado (el observer ignora si no hay más) */}
        {!loading && <div ref={sentinelRef} style={{ height: 1 }} />}

        {/* Skeletons de "cargando más" */}
        {!loading && hasMore && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, marginTop: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {/* Fin del feed */}
        {!loading && !hasMore && filtered.length > PAGE_SIZE && (
          <div style={{ textAlign: "center", padding: "2.5rem 0 1rem", color: "var(--text-3)", fontSize: 12 }}>
            · Ya viste todas las publicaciones ·
          </div>
        )}
      </div>
    </div>
  );
}
