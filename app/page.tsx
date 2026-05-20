"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import ProductCardSkeleton from "./components/ProductCardSkeleton";
import AdSlot from "./components/AdSlot";
import { LISTING_TYPES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, PROPERTY_TYPES, VEHICLE_TYPES, type ListingType } from "./data";
import { getLocalProducts, type LocalProduct } from "./lib/storage";
import { getCurrentUser, type LocalUser } from "./lib/auth";
import { haversineKm, formatDistance } from "./lib/geo";
import { createAlert, alertExists } from "./lib/alerts";
import { usePageTitle } from "./lib/usePageTitle";

type SortOption = "relevante" | "cercano" | "precio_asc" | "precio_desc" | "reciente";
type Condition  = "Todos" | "Nuevo" | "Usado";
type MaxDist    = "todos" | "5" | "10" | "25" | "50";

const PAGE_SIZE = 12;

function parsePrice(str: string): number {
  return parseInt(str.replace(/[$\s.]/g, ""), 10) || 0;
}

function HomeInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [activeType,     setActiveType]     = useState<"all" | ListingType>("all");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search,         setSearch]         = useState(initialQuery);
  usePageTitle(search ? `"${search}" — Búsqueda` : undefined);
  const [localProducts,  setLocalProducts]  = useState<LocalProduct[] | null>(null);
  const [currentUser,    setCurrentUser]    = useState<LocalUser | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Alertas de búsqueda
  const [alertSaved,     setAlertSaved]     = useState(false);  // feedback "¡guardado!"
  const [alertChecked,   setAlertChecked]   = useState<string>("");  // query ya verificada

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

  // Prompt de geolocalización cuando browser y perfil difieren
  const [geoPrompt, setGeoPrompt] = useState<{
    browserLat: number; browserLng: number;
  } | null>(null);

  // Paginación
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef    = useRef<HTMLDivElement>(null);
  // Bloquea el observer mientras se resetea la paginación
  const blockObserver  = useRef(false);
  const blockTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref con el total filtrado para que el observer no incremente de más
  const filteredTotal  = useRef(0);

  // Detectar primer uso (solo en cliente, evita SSR mismatch)
  useEffect(() => {
    try {
      if (!localStorage.getItem("estamosCerca_onboarded")) {
        setShowOnboarding(true);
      }
    } catch { /* localStorage bloqueado */ }
  }, []);

  function dismissOnboarding() {
    setShowOnboarding(false);
    try { localStorage.setItem("estamosCerca_onboarded", "1"); } catch { /* */ }
  }

  useEffect(() => {
    getLocalProducts().then(setLocalProducts);
    getCurrentUser().then(u => {
      setCurrentUser(u);
      if (u?.lat && u?.lng) { setUserLat(u.lat); setUserLng(u.lng); }

      // Pedir geolocalización del browser en segundo plano
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const bLat = pos.coords.latitude;
          const bLng = pos.coords.longitude;

          if (!u?.lat || !u?.lng) {
            // Sin ubicación en perfil → usar browser directamente
            setUserLat(bLat);
            setUserLng(bLng);
            return;
          }

          // Comparar con ubicación del perfil
          const diffKm = haversineKm(bLat, bLng, u.lat, u.lng);
          if (diffKm > 20) {
            // Difieren más de 20 km → preguntar al usuario
            setGeoPrompt({ browserLat: bLat, browserLng: bLng });
          }
          // Si están cerca, el perfil ya está cargado, no hace falta nada
        },
        () => { /* permiso denegado o error — no hacer nada */ },
        { timeout: 6000, maximumAge: 300000 },
      );
    });
  }, []);

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    blockObserver.current = true;
    setVisibleCount(PAGE_SIZE);
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => { blockObserver.current = false; }, 200);
    // Resetear estado de alerta cuando cambia la búsqueda
    setAlertSaved(false);
    setAlertChecked("");
  }, [activeCategory, search, priceMin, priceMax, condition, sortBy, maxDist, activeType]);

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

  const baseProducts = localProducts ?? [];

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

  // Categorías según tipo activo
  const activeCategories: string[] =
    activeType === "service"  ? SERVICE_CATEGORIES :
    activeType === "property" ? PROPERTY_TYPES :
    activeType === "vehicle"  ? VEHICLE_TYPES :
    PRODUCT_CATEGORIES;

  // Contar filtros activos (sin contar el sort)
  const activeFilterCount = [
    priceMin  !== "",
    priceMax  !== "",
    condition !== "Todos",
    maxDist   !== "todos",
  ].filter(Boolean).length;

  const filtered = allProducts
    .filter(p => {
      const matchType   = activeType === "all" || (p.listingType ?? "product") === activeType;
      const matchCat    = activeCategory === "Todos" || p.category === activeCategory;
      const q           = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q)
        || p.description?.toLowerCase().includes(q)
        || p.category.toLowerCase().includes(q)
        || p.location.toLowerCase().includes(q);
      const price       = parsePrice(p.price);
      const matchMin    = !priceMin || price >= parseInt(priceMin.replace(/\D/g, ""));
      const matchMax    = !priceMax || price <= parseInt(priceMax.replace(/\D/g, ""));
      const pCond       = (p as LocalProduct).condition;
      const matchCond   = condition === "Todos" || pCond === condition;
      // Filtro de distancia: solo aplica si el usuario tiene ubicación y el producto también
      const matchDist   = maxDist === "todos" || !hasUserLocation || p._km > 999
        ? true
        : p._km <= parseInt(maxDist);
      return matchType && matchCat && matchSearch && matchMin && matchMax && matchCond && matchDist;
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

  async function handleSaveAlert() {
    const q = search.trim();
    if (!q) return;
    if (!currentUser) { window.location.href = `/login?redirect=/`; return; }
    // Verificar si ya existe
    if (alertChecked !== q) {
      const exists = await alertExists(currentUser.id, q, activeCategory !== "Todos" ? activeCategory : null);
      setAlertChecked(q);
      if (exists) { setAlertSaved(true); return; }
    }
    await createAlert(currentUser.id, q, activeCategory !== "Todos" ? activeCategory : null);
    setAlertSaved(true);
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

        {/* Banner: ubicación del browser difiere del perfil */}
        {geoPrompt && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "13px 16px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                Tu ubicación actual es distinta a la de tu perfil
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                ¿Querés ver productos cerca de donde estás ahora?
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => {
                  setUserLat(geoPrompt.browserLat);
                  setUserLng(geoPrompt.browserLng);
                  setGeoPrompt(null);
                }}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "6px 12px",
                  background: "var(--green)", color: "#fff",
                  border: "none", borderRadius: 6, cursor: "pointer",
                }}
              >
                Usar ubicación actual
              </button>
              <button
                onClick={() => setGeoPrompt(null)}
                style={{
                  fontSize: 12, padding: "6px 12px",
                  background: "none", color: "var(--text-3)",
                  border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer",
                }}
              >
                Usar mi perfil
              </button>
            </div>
          </div>
        )}

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

        {/* Tipo de publicación — tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => { setActiveType("all"); setActiveCategory("Todos"); }}
            style={{
              padding: "6px 14px", borderRadius: 999,
              border: "1px solid",
              borderColor: activeType === "all" ? "var(--green)" : "var(--border)",
              background:  activeType === "all" ? "var(--green)" : "var(--surface)",
              color:       activeType === "all" ? "#fff" : "var(--text-2)",
              fontWeight:  activeType === "all" ? 700 : 400,
              fontSize: 13, cursor: "pointer", transition: "all 0.12s",
            }}
          >
            Todos
          </button>
          {LISTING_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setActiveType(t.value); setActiveCategory("Todos"); }}
              style={{
                padding: "6px 14px", borderRadius: 999,
                border: "1px solid",
                borderColor: activeType === t.value ? "var(--green)" : "var(--border)",
                background:  activeType === t.value ? "var(--green)" : "var(--surface)",
                color:       activeType === t.value ? "#fff" : "var(--text-2)",
                fontWeight:  activeType === t.value ? 700 : 400,
                fontSize: 13, cursor: "pointer", transition: "all 0.12s",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>{t.emoji}</span>
              {t.label}s
            </button>
          ))}
        </div>

        {/* Categorías — dinámicas según el tipo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px", marginBottom: 12 }}>
          {activeCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                border: "none",
                background:  activeCategory === cat ? "var(--green)" : "transparent",
                color:       activeCategory === cat ? "#fff" : "var(--text-3)",
                fontWeight:  activeCategory === cat ? 600 : 400,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Onboarding banner — primer uso */}
        {showOnboarding && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "20px 20px 18px",
            marginBottom: 16,
            position: "relative",
            animation: "onboarding-in 0.3s ease-out both",
          }}>
            <style>{`
              @keyframes onboarding-in {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Cerrar */}
            <button
              onClick={dismissOnboarding}
              title="Cerrar"
              style={{
                position: "absolute", top: 12, right: 12,
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--bg)", border: "1px solid var(--border)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--text-3)", fontSize: 16,
                lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>

            {/* Encabezado */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4 }}>
                👋 ¡Bienvenido a EstamosCerca!
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                La forma más fácil de comprar y vender en tu barrio.
                Sin intermediarios, sin envíos complicados.
              </div>
            </div>

            {/* Feature chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                { icon: "🔍", label: "Explorá productos cerca tuyo" },
                { icon: "📦", label: "Publicá gratis en segundos" },
                { icon: "💬", label: "Contactá directo al vendedor" },
              ].map(f => (
                <div key={f.label} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 999, padding: "5px 12px",
                  fontSize: 12, color: "var(--text-2)",
                }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={dismissOnboarding}
                style={{
                  padding: "8px 18px", borderRadius: 6, border: "none",
                  background: "var(--green)", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Explorar publicaciones
              </button>
              <Link
                href="/publicar"
                onClick={dismissOnboarding}
                style={{
                  padding: "8px 18px", borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text-2)",
                  fontSize: 13, fontWeight: 500, display: "inline-block",
                }}
              >
                + Publicar algo
              </Link>
            </div>
          </div>
        )}

        {/* Barra de filtros */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>

          {/* Botón Filtros */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
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

          {/* Sort pills — scroll horizontal en mobile */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1, paddingBottom: 2, scrollbarWidth: "none" }}>
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
                  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
            {loading ? "Cargando…" : `${filtered.length} publicaciones`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeFilterCount > 0 && !loading && (
              <button
                onClick={clearFilters}
                style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Limpiar filtros
              </button>
            )}
            {/* Botón de alerta: visible sólo cuando hay búsqueda activa */}
            {search.trim() && !loading && (
              alertSaved ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, color: "var(--green)",
                  background: "var(--green-subtle)", padding: "5px 11px",
                  borderRadius: 6, border: "1px solid #c5e8dc",
                }}>
                  🔔 Alerta guardada
                </div>
              ) : (
                <button
                  onClick={handleSaveAlert}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 500, color: "var(--text-2)",
                    background: "var(--surface)", padding: "5px 11px",
                    borderRadius: 6, border: "1px solid var(--border)",
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
                  title="Te avisaremos cuando aparezca un producto que coincida con esta búsqueda"
                >
                  🔔 Avisame cuando aparezca
                </button>
              )
            )}
          </div>
        </div>

        {/* Grid con slots de publicidad cada 4 productos */}
        <div className="product-grid">
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
            : visibleProducts.flatMap(({ _km: _ignored, ...p }, idx) => {
                const items = [<ProductCard key={p.id} product={p} />];
                if ((idx + 1) % 4 === 0) {
                  items.push(<AdSlot key={`ad-${idx}`} />);
                }
                return items;
              })
          }
        </div>

        {/* Sin resultados */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--text-3)" }}>
            <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Sin resultados</div>
            <div style={{ fontSize: 12, marginBottom: search.trim() ? 16 : 0 }}>
              {activeFilterCount > 0 ? "Probá ajustando los filtros." : "Intentá con otro término o categoría."}
            </div>
            {search.trim() && (
              alertSaved ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "var(--green)",
                  background: "var(--green-subtle)", padding: "8px 16px",
                  borderRadius: 8, border: "1px solid #c5e8dc",
                }}>
                  🔔 ¡Alerta guardada! Te avisamos cuando aparezca algo.
                </div>
              ) : (
                <button
                  onClick={handleSaveAlert}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 13, fontWeight: 500,
                    background: "var(--surface)", color: "var(--text-2)",
                    border: "1px solid var(--border)", borderRadius: 8,
                    padding: "9px 18px", cursor: "pointer",
                  }}
                >
                  🔔 Avisame cuando aparezca &quot;{search.trim()}&quot;
                </button>
              )
            )}
          </div>
        )}

        {/* Sentinel siempre montado (el observer ignora si no hay más) */}
        {!loading && <div ref={sentinelRef} style={{ height: 1 }} />}

        {/* Skeletons de "cargando más" */}
        {!loading && hasMore && (
          <div className="product-grid" style={{ marginTop: 12 }}>
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

export default function Home() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <HomeInner />
    </Suspense>
  );
}
