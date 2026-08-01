"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { getRecentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches } from "./lib/recentSearches";
import { getViewedCategories } from "./lib/viewedProducts";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import ProductCardSkeleton from "./components/ProductCardSkeleton";
import AdSlot from "./components/AdSlot";
import { LISTING_TYPES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, PROPERTY_TYPES, VEHICLE_TYPES, type ListingType } from "./data";
import { getLocalProducts, getBusinesses, type LocalProduct, type LocalBusiness } from "./lib/storage";
import { getCurrentUser, type LocalUser } from "./lib/auth";
import { getFavorites } from "./lib/favorites";
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
  const [businesses,     setBusinesses]     = useState<LocalBusiness[]>([]);
  const [currentUser,    setCurrentUser]    = useState<LocalUser | null>(null);
  const [favIds,         setFavIds]         = useState<Set<number>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Alertas de búsqueda
  const [alertSaved,     setAlertSaved]     = useState(false);  // feedback "¡guardado!"
  const [alertChecked,   setAlertChecked]   = useState<string>("");  // query ya verificada

  // Botón "subir al inicio"
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Sidebar de filtros (en mobile se despliega con un botón)
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Búsquedas recientes y categorías visitadas (personalizacion)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewedCats,     setViewedCats]     = useState<string[]>([]);

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

  // Cargar búsquedas recientes y categorías visitadas desde localStorage
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    setViewedCats(getViewedCategories());
  }, []);

  // Mostrar botón "subir al inicio" al bajar
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Guardar búsqueda con debounce de 1.5s cuando hay al menos 2 caracteres
  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 2) return;
    const timer = setTimeout(() => {
      const updated = saveRecentSearch(q);
      setRecentSearches(updated);
    }, 1500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getLocalProducts().then(setLocalProducts);
    getBusinesses().then(setBusinesses);
    getCurrentUser().then(u => {
      setCurrentUser(u);
      if (u?.lat && u?.lng) { setUserLat(u.lat); setUserLng(u.lng); }
      // Cargar todos los favoritos de una vez (1 query en vez de N)
      if (u) getFavorites(u.id).then(ids => setFavIds(new Set(ids)));

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

  // Negocios que coinciden con la búsqueda (por nombre, rubro, descripción o zona)
  const q = search.trim().toLowerCase();
  const matchedBusinesses = q
    ? businesses.filter(b =>
        b.businessName.toLowerCase().includes(q)
        || b.businessCategory?.toLowerCase().includes(q)
        || b.businessDesc?.toLowerCase().includes(q)
        || b.location?.toLowerCase().includes(q))
    : [];
  const matchedBizIds = new Set(matchedBusinesses.map(b => b.id));

  const filtered = allProducts
    .filter(p => {
      const matchType   = activeType === "all" || (p.listingType ?? "product") === activeType;
      const matchCat    = activeCategory === "Todos" || p.category === activeCategory;
      const matchSearch = !q || p.title.toLowerCase().includes(q)
        || p.description?.toLowerCase().includes(q)
        || p.category.toLowerCase().includes(q)
        || p.location.toLowerCase().includes(q)
        || (!!p.userId && matchedBizIds.has(p.userId));  // productos de un negocio que matchea
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

        {/* Búsquedas recientes — chips debajo del hero cuando el buscador está vacío */}
        {!search && recentSearches.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: 0.3, textTransform: "uppercase", flexShrink: 0 }}>
              Recientes:
            </span>
            {recentSearches.map(s => (
              <span
                key={s}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 999, padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                <button
                  onClick={() => setSearch(s)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-2)", fontSize: 12, padding: 0, fontFamily: "inherit", lineHeight: 1 }}
                >
                  🕐 {s}
                </button>
                <button
                  onClick={() => setRecentSearches(removeRecentSearch(s))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 15, padding: "0 0 0 2px", lineHeight: 1 }}
                  title="Eliminar"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
              style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", marginLeft: 2, textDecoration: "underline" }}
            >
              Borrar todo
            </button>
          </div>
        )}

        {/* Onboarding banner — primer uso (full width, arriba del layout) */}
        {showOnboarding && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "20px 20px 18px",
            marginBottom: 16,
            position: "relative",
            boxShadow: "var(--shadow-sm)",
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

        {/* Botón para desplegar filtros — solo mobile */}
        <button
          className={"filters-toggle" + (activeFilterCount > 0 ? " active" : "")}
          onClick={() => setSidebarOpen(o => !o)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {sidebarOpen ? "Ocultar filtros" : "Filtros y categorías"}
          {activeFilterCount > 0 && (
            <span style={{
              background: "var(--green)", color: "#fff",
              borderRadius: "50%", width: 18, height: 18,
              fontSize: 11, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* ── Layout: sidebar de filtros (izq) + grilla (der) ── */}
        <div className="feed-layout">
          <aside className={"feed-sidebar" + (sidebarOpen ? " open" : "")}>

        {/* ── Tipo ── */}
        <div className="sidebar-section">
          <div className="sidebar-title">Tipo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[{ value: "all" as const, label: "Todos", emoji: "🧭" },
              ...LISTING_TYPES.map(t => ({ value: t.value, label: `${t.label}s`, emoji: t.emoji }))
            ].map(item => {
              const active = activeType === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => { setActiveType(item.value as "all" | ListingType); setActiveCategory("Todos"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                    padding: "8px 12px", borderRadius: 8, border: "1px solid",
                    borderColor: active ? "var(--green)" : "var(--border)",
                    background:  active ? "var(--green-subtle)" : "var(--surface)",
                    color:       active ? "var(--green)" : "var(--text-2)",
                    fontWeight:  active ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{item.emoji}</span>
                  {item.label}
                </button>
              );
            })}
            <Link
              href="/negocios"
              style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                padding: "8px 12px", borderRadius: 8,
                border: "1px dashed var(--green)", background: "var(--surface)",
                color: "var(--green)", fontWeight: 600, fontSize: 13, textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 15 }}>🏪</span> Ver negocios
            </Link>
          </div>
        </div>

        {/* ── Categorías ── */}
        <div className="sidebar-section">
          <div className="sidebar-title">Categorías</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 6px" }}>
            {activeCategories.map(cat => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "5px 11px", borderRadius: 999, border: "1px solid",
                    borderColor: active ? "var(--green)" : "var(--border)",
                    background:  active ? "var(--green)" : "var(--surface)",
                    color:       active ? "#fff" : "var(--text-2)",
                    fontWeight:  active ? 600 : 400,
                    fontSize: 12, cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Ordenar ── */}
        <div className="sidebar-section">
          <div className="sidebar-title">Ordenar por</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => {
              const active = sortBy === key;
              return (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                    padding: "7px 12px", borderRadius: 8, border: "1px solid",
                    borderColor: active ? "var(--green)" : "var(--border)",
                    background:  active ? "var(--green-subtle)" : "var(--surface)",
                    color:       active ? "var(--green)" : "var(--text-2)",
                    fontWeight:  active ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Precio ── */}
        <div className="sidebar-section">
          <div className="sidebar-title">Precio</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={priceMin}
              onChange={e => setPriceMin(e.target.value.replace(/\D/g, ""))}
              placeholder="Mín."
              inputMode="numeric"
              style={{
                flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 6,
                border: "1px solid var(--border)", fontSize: 13,
                color: "var(--text)", background: "var(--bg)", outline: "none", fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>
            <input
              value={priceMax}
              onChange={e => setPriceMax(e.target.value.replace(/\D/g, ""))}
              placeholder="Máx."
              inputMode="numeric"
              style={{
                flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 6,
                border: "1px solid var(--border)", fontSize: 13,
                color: "var(--text)", background: "var(--bg)", outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* ── Condición ── */}
        <div className="sidebar-section">
          <div className="sidebar-title">Condición</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["Todos", "Nuevo", "Usado"] as Condition[]).map(c => {
              const active = condition === c;
              return (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    padding: "6px 13px", borderRadius: 6, border: "1px solid",
                    borderColor: active ? "var(--green)" : "var(--border)",
                    background:  active ? "var(--green-subtle)" : "var(--bg)",
                    color:       active ? "var(--green)" : "var(--text-2)",
                    fontWeight:  active ? 600 : 400, fontSize: 13, cursor: "pointer",
                  }}
                >{c}</button>
              );
            })}
          </div>
        </div>

        {/* ── Distancia ── */}
        {hasUserLocation && (
          <div className="sidebar-section">
            <div className="sidebar-title">Distancia</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["todos", "5", "10", "25", "50"] as MaxDist[]).map(d => {
                const active = maxDist === d;
                return (
                  <button
                    key={d}
                    onClick={() => setMaxDist(d)}
                    style={{
                      padding: "6px 13px", borderRadius: 6, border: "1px solid",
                      borderColor: active ? "var(--green)" : "var(--border)",
                      background:  active ? "var(--green-subtle)" : "var(--bg)",
                      color:       active ? "var(--green)" : "var(--text-2)",
                      fontWeight:  active ? 600 : 400, fontSize: 13, cursor: "pointer",
                    }}
                  >{d === "todos" ? "Todos" : `${d} km`}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Limpiar ── */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            style={{
              width: "100%", padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: "none", border: "1px solid var(--border)",
              color: "var(--text-2)", cursor: "pointer", marginBottom: 18,
            }}
          >
            Limpiar filtros ({activeFilterCount})
          </button>
        )}

          </aside>

          {/* ── Columna principal: resultados ── */}
          <main className="feed-main">

        {/* Para vos — productos de categorías que el usuario visitó */}
        {(() => {
          if (search || loading || activeCategory !== "Todos" || activeType !== "all") return null;
          const paraVos = allProducts
            .filter(p => viewedCats.includes(p.category) && !p.sold && p.userId !== currentUser?.id)
            .sort((a, b) => viewedCats.indexOf(a.category) - viewedCats.indexOf(b.category))
            .slice(0, 10);
          if (!paraVos.length) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>✨ Para vos</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Basado en lo que viste</div>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as const }}>
                {paraVos.map(p => (
                  <Link key={p.id} href={`/producto/${p.id}`} style={{ textDecoration: "none", flexShrink: 0, display: "block" }}>
                    <div
                      style={{
                        width: 144, background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 10, overflow: "hidden", transition: "border-color 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-3)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div style={{ height: 90, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {p.images?.[0]
                          /* eslint-disable-next-line @next/next/no-img-element */
                          ? <img src={p.images[0]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 32 }}>{p.emoji}</span>
                        }
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                          {p.price}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tira de negocios que coinciden con la búsqueda */}
        {search.trim() && matchedBusinesses.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 6 }}>
                🏪 Negocios
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>
                  ({matchedBusinesses.length})
                </span>
              </div>
              <Link href={`/negocios?q=${encodeURIComponent(search.trim())}`} style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                Ver todos →
              </Link>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as const }}>
              {matchedBusinesses.slice(0, 8).map(b => (
                <Link
                  key={b.id}
                  href={`/negocio/${b.businessSlug}`}
                  style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 999, padding: "6px 14px 6px 6px", textDecoration: "none",
                    transition: "border-color 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--green)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "var(--green-subtle)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {b.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={b.avatarUrl} alt={b.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--green)" }}>{b.businessName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      {b.businessName}
                      {b.cuitVerified && <span style={{ color: "var(--green)" }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {b.productCount} publicación{b.productCount !== 1 ? "es" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
                const items = [<ProductCard key={p.id} product={p} userId={currentUser?.id} favIds={favIds} />];
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

        {/* Sentinel siempre montado — el observer callback no hace nada si filteredTotal=0 */}
        <div ref={sentinelRef} style={{ height: 1 }} />

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

          </main>
        </div>{/* /feed-layout */}
      </div>

      {/* Botón subir al inicio */}
      {showScrollTop && (
        <button
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Subir al inicio"
          aria-label="Subir al inicio"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      )}
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
