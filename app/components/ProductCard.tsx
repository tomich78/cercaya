"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isFavorite, toggleFavorite } from "../lib/favorites";
import { getCurrentUser } from "../lib/auth";
import { useToast } from "./ToastProvider";

interface Product {
  id: number;
  emoji: string;
  title: string;
  price: string;
  location: string;
  distance: string;
  bg: string;
  verified: boolean;
  images?: string[];
  condition?: "Nuevo" | "Usado";
  featured?: boolean;
  sellerIsBusiness?: boolean;
  sellerCuitVerified?: boolean;
  sellerBusinessSlug?: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const router    = useRouter();
  const { toast } = useToast();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) isFavorite(u.id, product.id).then(setFav);
    });
  }, [product.id]);

  async function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const user = await getCurrentUser();
    if (!user) { router.push("/login"); return; }
    const next = await toggleFavorite(user.id, product.id);
    setFav(next);
    toast(next ? "Guardado en tu lista ♡" : "Eliminado de guardados", next ? "success" : "info");
  }

  return (
    <div
      onClick={() => router.push(`/producto/${product.id}`)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${product.featured ? "#f59e0b" : "var(--border)"}`,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.12s, box-shadow 0.12s",
        position: "relative",
        boxShadow: product.featured ? "0 0 0 1px #fde68a" : "none",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = product.featured ? "#d97706" : "#bfbfbb";
        if (!product.featured) el.style.boxShadow = "none";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = product.featured ? "#f59e0b" : "var(--border)";
        el.style.boxShadow   = product.featured ? "0 0 0 1px #fde68a" : "none";
      }}
    >
        {/* Ribbon destacado */}
        {product.featured && (
          <div style={{
            background: "linear-gradient(90deg, #f59e0b, #d97706)",
            color: "#fff",
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: "uppercase" as const,
            padding: "3px 10px",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span>⭐</span> Destacado
          </div>
        )}

        {/* Imagen */}
        <div style={{
          background: product.bg,
          height: product.featured ? 116 : 128,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          position: "relative",
          overflow: "hidden",
        }}>
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            product.emoji
          )}

          {/* Badge condición */}
          {product.condition && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              fontSize: 10, fontWeight: 700,
              letterSpacing: 0.3, textTransform: "uppercase" as const,
              padding: "2px 7px", borderRadius: 4,
              background: product.condition === "Nuevo" ? "var(--green)" : "rgba(0,0,0,0.52)",
              color: "#fff",
            }}>
              {product.condition}
            </div>
          )}

          {/* Botón corazón */}
          <button
            onClick={handleFav}
            title={fav ? "Quitar de guardados" : "Guardar"}
            style={{
              position: "absolute",
              top: 8, right: 8,
              width: 28, height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.88)",
              border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
              boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
              transition: "transform 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {fav ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e53e3e">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: "10px 13px 12px" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: "var(--text)", lineHeight: 1.35 }}>
            {product.title}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--green)", marginBottom: 6, letterSpacing: -0.3 }}>
            {product.price}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{product.location}</span>
            <span style={{ color: "var(--green)", fontWeight: 500 }}>{product.distance}</span>
          </div>

          {/* Footer: verificado + negocio */}
          {(product.verified || product.sellerIsBusiness) && (
            <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid var(--border)", display: "flex", gap: 5, flexWrap: "wrap" }}>
              {product.verified && (
                <span style={{
                  fontSize: 10, background: "var(--green-subtle)", color: "var(--green)",
                  padding: "2px 7px", borderRadius: 3, fontWeight: 600,
                  textTransform: "uppercase" as const, letterSpacing: 0.3,
                }}>Verificado</span>
              )}
              {product.sellerIsBusiness && (
                product.sellerBusinessSlug ? (
                  <Link
                    href={`/negocio/${product.sellerBusinessSlug}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                      textTransform: "uppercase" as const, padding: "2px 7px", borderRadius: 3,
                      background: product.sellerCuitVerified ? "var(--green)" : "#1d4ed8",
                      color: "#fff", textDecoration: "none",
                    }}
                  >
                    {product.sellerCuitVerified ? "✓ Negocio →" : "🏪 Negocio →"}
                  </Link>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                    textTransform: "uppercase" as const, padding: "2px 7px", borderRadius: 3,
                    background: product.sellerCuitVerified ? "var(--green)" : "#1d4ed8",
                    color: "#fff",
                  }}>
                    {product.sellerCuitVerified ? "✓ Negocio" : "🏪 Negocio"}
                  </span>
                )
              )}
            </div>
          )}
        </div>
    </div>
  );
}
