"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import BotonPago from "../../components/BotonPago";
import { getCurrentUser } from "../../lib/auth";
import { getProductById } from "../../lib/storage";
import { PRECIOS } from "../../api/pagos/preferencia/route";

export default function DestacarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [userId,       setUserId]       = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productEmoji, setProductEmoji] = useState("📦");
  const [featured,     setFeatured]     = useState(false);
  const [ready,        setReady]        = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace(`/login?redirect=/destacar/${id}`); return; }
      const p = await getProductById(Number(id));
      if (!p || p.userId !== u.id) { router.replace("/perfil"); return; }
      setUserId(u.id);
      setProductTitle(p.title);
      setProductEmoji(p.emoji);
      setFeatured(!!p.featured);
      setReady(true);
    })();
  }, [id, router]);

  if (!ready) return <div><Navbar /></div>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/perfil" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>
          ← Mis publicaciones
        </Link>

        {/* Producto */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "14px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>{productEmoji}</div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 2 }}>Publicación a destacar</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{productTitle}</div>
          </div>
        </div>

        {featured ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>
              ¡Esta publicación ya está destacada!
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6 }}>
              Aparece primera en el feed con el ribbon dorado de destacado.
            </p>
            <Link href={`/producto/${id}`} style={{
              background: "var(--green)", color: "#fff", borderRadius: 6,
              padding: "9px 18px", fontSize: 13, fontWeight: 500,
            }}>
              Ver publicación
            </Link>
          </div>
        ) : (
          <div>
            {/* Card de opciones */}
            <div style={{
              border: "2px solid #f59e0b", borderRadius: 10,
              padding: "20px", marginBottom: 16,
              background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 12 }}>
                ⭐ Publicación Destacada
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {[
                  "Aparece primero en el feed de resultados",
                  "Ribbon dorado ⭐ visible en la tarjeta",
                  "Mayor visibilidad en búsquedas y categorías",
                ].map(t => (
                  <div key={t} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                    <span style={{ color: "#d97706", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {t}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <BotonPago
                  tipo="destacar_7"
                  userId={userId}
                  productId={Number(id)}
                  label="Destacar 7 días"
                  descripcion="Pago único — se activa de inmediato"
                  precio={PRECIOS.destacar_7}
                  style={{ background: "linear-gradient(90deg,#f59e0b,#d97706)" }}
                />
                <BotonPago
                  tipo="destacar_30"
                  userId={userId}
                  productId={Number(id)}
                  label="Destacar 30 días"
                  descripcion="Mejor valor — pago único"
                  precio={PRECIOS.destacar_30}
                  style={{ background: "linear-gradient(90deg,#b45309,#92400e)" }}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
              Pagás con Mercado Pago · Tarjeta, débito o saldo MP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
