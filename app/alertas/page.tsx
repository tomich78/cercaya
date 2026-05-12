"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getCurrentUser } from "../lib/auth";
import { getUserAlerts, deleteAlert, type SearchAlert } from "../lib/alerts";
import { usePageTitle } from "../lib/usePageTitle";

export default function AlertasPage() {
  usePageTitle("Mis alertas");
  const router = useRouter();
  const [alerts,  setAlerts]  = useState<SearchAlert[]>([]);
  const [ready,   setReady]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login?redirect=/alertas"); return; }
      const list = await getUserAlerts(u.id);
      setAlerts(list);
      setReady(true);
    })();
  }, [router]);

  async function handleDelete(id: number) {
    setDeleting(id);
    await deleteAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  }

  if (!ready) return <div><Navbar /></div>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Inicio
        </Link>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
            🔔 Alertas de búsqueda
          </h1>
          <Link href="/" style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
            + Nueva búsqueda
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "3rem 2rem", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No tenés alertas guardadas</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20, lineHeight: 1.6 }}>
              Buscá algo en el inicio y hacé clic en <strong>&quot;Avisame cuando aparezca&quot;</strong> para recibir alertas de nuevos productos.
            </div>
            <Link href="/" style={{
              display: "inline-block",
              background: "var(--green)", color: "#fff",
              padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500,
            }}>
              Ir a buscar
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map(a => (
              <div key={a.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🔔</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    &ldquo;{a.query}&rdquo;
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {a.category ? `Categoría: ${a.category}` : "Todas las categorías"}
                    {" · "}
                    {new Date(a.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/?q=${encodeURIComponent(a.query)}`}
                    style={{
                      fontSize: 12, fontWeight: 500, color: "var(--green)",
                      background: "var(--green-subtle)", padding: "5px 10px",
                      borderRadius: 5, border: "1px solid #c5e8dc",
                    }}
                  >
                    Ver resultados
                  </Link>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    style={{
                      fontSize: 12, color: "var(--text-3)",
                      background: "none", border: "1px solid var(--border)",
                      borderRadius: 5, padding: "5px 10px", cursor: "pointer",
                      opacity: deleting === a.id ? 0.5 : 1,
                    }}
                  >
                    {deleting === a.id ? "…" : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <div style={{ marginTop: 20, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
            Revisá esta página para ver si aparecieron nuevos productos que coincidan con tus búsquedas guardadas. Próximamente: notificaciones automáticas.
          </div>
        )}
      </div>
    </div>
  );
}
