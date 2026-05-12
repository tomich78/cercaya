"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import { usePageTitle } from "../../lib/usePageTitle";
import { supabase } from "../../lib/supabase";
import { incrementProfileViews, type LocalProduct } from "../../lib/storage";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BusinessProfile {
  id: string;
  name: string;
  businessName: string;
  businessCategory?: string;
  businessHours?: string;
  businessDesc?: string;
  businessCuitVerified: boolean;
  businessSlug: string;
  avatarUrl?: string;
  location?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function rowToProduct(row: Record<string, unknown>): LocalProduct {
  return {
    id:           row.id as number,
    emoji:        row.emoji as string,
    title:        row.title as string,
    price:        row.price as string,
    location:     row.location as string,
    distance:     row.distance as string,
    bg:           row.bg as string,
    verified:     row.verified as boolean,
    category:     row.category as string,
    description:  row.description as string,
    condition:    row.condition as "Nuevo" | "Usado" | undefined,
    images:       (row.images as string[] | null) ?? [],
    lat:          row.lat as number | undefined,
    lng:          row.lng as number | undefined,
    sold:         (row.sold as boolean) ?? false,
    featured:     (row.featured as boolean) ?? false,
    sellerId:     0,
    userId:       row.user_id as string | undefined,
    createdAt:    row.created_at as string,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BusinessPageSkeleton() {
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "2rem", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 24, width: "40%", borderRadius: 6, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 14, width: "25%", borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
            </div>
          </div>
        </div>
        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div className="skeleton" style={{ height: 130 }} />
              <div style={{ padding: "10px 13px 14px" }}>
                <div className="skeleton" style={{ height: 13, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: "50%", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function NegocioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [biz,      setBiz]      = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageTitle(biz?.businessName ?? "Negocio");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // 1. Buscar perfil por slug
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, business_name, business_category, business_hours, business_desc, business_cuit_verified, business_slug, avatar_url, location, created_at")
        .eq("business_slug", slug)
        .eq("is_business", true)
        .eq("business_paid", true)
        .single();

      if (!profile) { setNotFound(true); setLoading(false); return; }

      // Incrementar visitas a la página (fire & forget)
      incrementProfileViews(profile.id as string);

      setBiz({
        id:                   profile.id as string,
        name:                 profile.name as string,
        businessName:         (profile.business_name as string) || (profile.name as string),
        businessCategory:     profile.business_category as string | undefined,
        businessHours:        profile.business_hours as string | undefined,
        businessDesc:         profile.business_desc as string | undefined,
        businessCuitVerified: (profile.business_cuit_verified as boolean) ?? false,
        businessSlug:         profile.business_slug as string,
        avatarUrl:            profile.avatar_url as string | undefined,
        location:             profile.location as string | undefined,
        createdAt:            profile.created_at as string,
      });

      // 2. Buscar sus productos activos
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", profile.id as string)
        .eq("sold", false)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      setProducts((prods ?? []).map(rowToProduct));
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <BusinessPageSkeleton />;

  if (notFound) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 500, margin: "6rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Negocio no encontrado</h1>
        <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 24 }}>
          Este negocio no existe o todavía no activó su página pública.
        </p>
        <Link href="/" style={{ color: "var(--green)", fontWeight: 600, fontSize: 14 }}>← Volver al inicio</Link>
      </div>
    </div>
  );

  const biz_ = biz!;
  const initials = biz_.businessName.slice(0, 2).toUpperCase();

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>

        {/* ── Header del negocio ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "2rem", marginTop: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* Logo / Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
              background: "var(--green-subtle)",
              border: "3px solid var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {biz_.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={biz_.avatarUrl} alt={biz_.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--green)" }}>{initials}</span>
              )}
            </div>

            {/* Info principal */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
                  {biz_.businessName}
                </h1>
                {biz_.businessCuitVerified ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                    background: "var(--green)", color: "#fff",
                    padding: "3px 9px", borderRadius: 20,
                  }}>✓ Verificado</span>
                ) : (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                    background: "#1d4ed8", color: "#fff",
                    padding: "3px 9px", borderRadius: 20,
                  }}>🏪 Negocio</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
                {biz_.businessCategory && (
                  <span>📦 {biz_.businessCategory}</span>
                )}
                {biz_.location && (
                  <span>📍 {biz_.location}</span>
                )}
                <span>🗓 En EstamosCerca desde {memberSince(biz_.createdAt)}</span>
              </div>

              {biz_.businessDesc && (
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
                  {biz_.businessDesc}
                </p>
              )}
            </div>

            {/* CTA contacto */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
              <Link
                href={`/mensajes?seller=${biz_.id}`}
                style={{
                  background: "var(--green)", color: "#fff",
                  borderRadius: 7, padding: "9px 18px",
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                  textAlign: "center", display: "block",
                }}
              >
                Enviar mensaje
              </Link>
              <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
                {products.length} producto{products.length !== 1 ? "s" : ""} activo{products.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Horarios */}
          {biz_.businessHours && (
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "var(--text-2)",
            }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <div>
                <span style={{ fontWeight: 600, marginRight: 6 }}>Horario:</span>
                {biz_.businessHours}
              </div>
            </div>
          )}
        </div>

        {/* ── Productos ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2, marginBottom: 16 }}>
            Publicaciones activas
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>
              ({products.length})
            </span>
          </div>

          {products.length === 0 ? (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "3rem", textAlign: "center",
              color: "var(--text-3)", fontSize: 14,
            }}>
              Este negocio no tiene publicaciones activas por el momento.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}>
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    sellerIsBusiness:   true,
                    sellerCuitVerified: biz_.businessCuitVerified,
                    sellerBusinessSlug: biz_.businessSlug,
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
