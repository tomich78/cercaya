"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { getFavorites, toggleFavorite } from "../lib/favorites";
import { products } from "../data";
import { getLocalProducts, type LocalProduct } from "../lib/storage";
import { getCurrentUser } from "../lib/auth";
import { usePageTitle } from "../lib/usePageTitle";

type AnyProduct = (typeof products)[0] | LocalProduct;

export default function GuardadosPage() {
  usePageTitle("Mis guardados");
  const router = useRouter();
  const [savedProducts, setSavedProducts] = useState<AnyProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace("/login?redirect=/guardados");
        return;
      }

      const favIds   = await getFavorites(u.id);
      const allProds = [...(await getLocalProducts({ includeSold: true })), ...products] as AnyProduct[];
      const saved    = favIds
        .map(id => allProds.find(p => p.id === id))
        .filter((p): p is AnyProduct => !!p);

      setSavedProducts(saved);
      setHydrated(true);
    })();
  }, [router]);

  if (!hydrated) {
    return <div><Navbar /></div>;
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
              Mis guardados
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              {savedProducts.length} {savedProducts.length === 1 ? "producto guardado" : "productos guardados"}
            </div>
          </div>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>
            ← Inicio
          </Link>
        </div>

        {/* Grid */}
        {savedProducts.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
            {savedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center", padding: "6rem 0",
            color: "var(--text-3)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>♡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
              Todavía no guardaste nada
            </div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>
              Tocá el corazón en cualquier publicación para guardarla acá.
            </div>
            <Link href="/" style={{
              display: "inline-block",
              background: "var(--green)", color: "#fff",
              padding: "9px 20px", borderRadius: 6,
              fontSize: 13, fontWeight: 500,
            }}>
              Explorar publicaciones
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
