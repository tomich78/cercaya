"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getCurrentUser } from "../lib/auth";
import { supabase } from "../lib/supabase";

// ── Cambiá este email por el de tu cuenta ─────────────────────
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@EstamosCerca.com.ar";

interface DniRequest {
  id: string;
  name: string;
  email: string;
  dniNumber: string;
  dniDocUrl: string;      // path en Storage
  dniDocSignedUrl: string; // URL temporal para ver el doc
  submittedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [requests, setRequests] = useState<DniRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);
  const [tab,      setTab]      = useState<"dni" | "negocios" | "destacados">("dni");

  // Stats
  const [stats, setStats] = useState({ pendingDni: 0, activeBusinesses: 0, featuredProducts: 0, totalProducts: 0, totalUsers: 0 });

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u || u.email !== ADMIN_EMAIL) {
        router.replace("/");
        return;
      }
      setReady(true);
      await loadData();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadDniRequests(), loadStats()]);
    setLoading(false);
  }

  async function loadDniRequests() {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, dni_number, dni_doc_url, updated_at")
      .eq("dni_status", "pending")
      .order("updated_at", { ascending: true });

    if (!data) return;

    // Generar URLs firmadas para cada documento
    const enriched = await Promise.all(data.map(async (row) => {
      const docPath = row.dni_doc_url as string;
      let signedUrl = "";
      if (docPath) {
        const { data: signed } = await supabase.storage
          .from("dni-docs")
          .createSignedUrl(docPath, 600); // válida 10 min
        signedUrl = signed?.signedUrl ?? "";
      }
      return {
        id:              row.id as string,
        name:            row.name as string,
        email:           row.email as string ?? "",
        dniNumber:       row.dni_number as string ?? "—",
        dniDocUrl:       docPath,
        dniDocSignedUrl: signedUrl,
        submittedAt:     row.updated_at as string,
      };
    }));
    setRequests(enriched);
  }

  async function loadStats() {
    const [
      { count: pendingDni },
      { count: activeBusinesses },
      { count: featuredProducts },
      { count: totalProducts },
      { count: totalUsers },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("dni_status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_business", true),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("featured", true),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      pendingDni:       pendingDni       ?? 0,
      activeBusinesses: activeBusinesses ?? 0,
      featuredProducts: featuredProducts ?? 0,
      totalProducts:    totalProducts    ?? 0,
      totalUsers:       totalUsers       ?? 0,
    });
  }

  async function handleApprove(userId: string) {
    setActing(userId);
    const { error } = await supabase.rpc("admin_approve_dni", { target_user_id: userId });
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== userId));
      setStats(s => ({ ...s, pendingDni: s.pendingDni - 1 }));
    }
    setActing(null);
  }

  async function handleReject(userId: string) {
    setActing(userId);
    const { error } = await supabase.rpc("admin_reject_dni", { target_user_id: userId });
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== userId));
      setStats(s => ({ ...s, pendingDni: s.pendingDni - 1 }));
    }
    setActing(null);
  }

  if (!ready) return <div><Navbar /></div>;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? "var(--green-subtle)" : "none",
    color: active ? "var(--green)" : "var(--text-3)",
    border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
    cursor: "pointer",
  });

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>Panel de administración</h1>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>EstamosCerca — vista interna</div>
          </div>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "DNI pendientes", value: stats.pendingDni,       color: stats.pendingDni > 0 ? "#d97706" : "var(--text)", bg: stats.pendingDni > 0 ? "#fef3c7" : "var(--surface)" },
            { label: "Negocios activos", value: stats.activeBusinesses, color: "#1d4ed8",     bg: "#dbeafe" },
            { label: "Destacados",       value: stats.featuredProducts, color: "#d97706",     bg: "#fef3c7" },
            { label: "Publicaciones",    value: stats.totalProducts,    color: "var(--text)", bg: "var(--surface)" },
            { label: "Usuarios",         value: stats.totalUsers,       color: "var(--text)", bg: "var(--surface)" },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: "1px solid var(--border)", borderRadius: 8,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button style={tabStyle(tab === "dni")}       onClick={() => setTab("dni")}>
            DNI pendientes {stats.pendingDni > 0 && <span style={{ background: "#d97706", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 6 }}>{stats.pendingDni}</span>}
          </button>
          <button style={tabStyle(tab === "negocios")}  onClick={() => setTab("negocios")}>Negocios</button>
          <button style={tabStyle(tab === "destacados")} onClick={() => setTab("destacados")}>Destacados</button>
        </div>

        {/* ── Tab: DNI ── */}
        {tab === "dni" && (
          <div>
            {loading ? (
              <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Cargando...</div>
            ) : requests.length === 0 ? (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "3rem", textAlign: "center", color: "var(--text-3)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sin solicitudes pendientes</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {requests.map(req => (
                  <div key={req.id} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "16px",
                    display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start",
                  }}>
                    {/* Foto del DNI */}
                    <div style={{ flexShrink: 0 }}>
                      {req.dniDocSignedUrl ? (
                        <a href={req.dniDocSignedUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={req.dniDocSignedUrl}
                            alt="DNI"
                            style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", display: "block" }}
                          />
                          <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4, textAlign: "center" }}>Ver imagen →</div>
                        </a>
                      ) : (
                        <div style={{ width: 160, height: 100, borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-3)" }}>
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{req.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 2 }}>{req.email}</div>
                      <div style={{ fontSize: 13, marginBottom: 2 }}>DNI <strong>{req.dniNumber}</strong></div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                        Enviado: {new Date(req.submittedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={acting === req.id}
                          style={{
                            padding: "7px 16px", background: "var(--green)", color: "#fff",
                            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
                            cursor: acting === req.id ? "default" : "pointer",
                            opacity: acting === req.id ? 0.6 : 1,
                          }}
                        >
                          {acting === req.id ? "..." : "✓ Aprobar"}
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={acting === req.id}
                          style={{
                            padding: "7px 16px", background: "none", color: "#dc2626",
                            border: "1px solid #dc2626", borderRadius: 6, fontSize: 13, fontWeight: 600,
                            cursor: acting === req.id ? "default" : "pointer",
                            opacity: acting === req.id ? 0.6 : 1,
                          }}
                        >
                          ✕ Rechazar
                        </button>
                        <Link
                          href={`/vendedor/${req.id}`}
                          target="_blank"
                          style={{ padding: "7px 14px", fontSize: 12, color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center" }}
                        >
                          Ver perfil
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Negocios ── */}
        {tab === "negocios" && <BusinessTab />}

        {/* ── Tab: Destacados ── */}
        {tab === "destacados" && <FeaturedTab />}
      </div>
    </div>
  );
}

// ── Sub-tab: Negocios ─────────────────────────────────────────────────────────

function BusinessTab() {
  const [rows, setRows] = useState<{ id: string; name: string; businessName: string; businessCategory: string; cuitVerified: boolean; paid: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, business_name, business_category, business_cuit_verified, business_paid")
        .eq("is_business", true)
        .order("created_at", { ascending: false });
      setRows((data ?? []).map(r => ({
        id:               r.id as string,
        name:             r.name as string,
        businessName:     (r.business_name as string) ?? "—",
        businessCategory: (r.business_category as string) ?? "—",
        cuitVerified:     (r.business_cuit_verified as boolean) ?? false,
        paid:             (r.business_paid as boolean) ?? false,
      })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Cargando...</div>;
  if (rows.length === 0) return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Sin negocios registrados.</div>;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {["Titular", "Negocio", "Rubro", "CUIT", "Pago"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <td style={{ padding: "11px 14px", fontWeight: 500 }}>
                <Link href={`/vendedor/${r.id}`} style={{ color: "var(--green)" }}>{r.name}</Link>
              </td>
              <td style={{ padding: "11px 14px" }}>{r.businessName}</td>
              <td style={{ padding: "11px 14px", color: "var(--text-3)" }}>{r.businessCategory}</td>
              <td style={{ padding: "11px 14px" }}>
                {r.cuitVerified
                  ? <span style={{ color: "var(--green)", fontWeight: 600 }}>✓ Verificado</span>
                  : <span style={{ color: "var(--text-3)" }}>—</span>}
              </td>
              <td style={{ padding: "11px 14px" }}>
                {r.paid
                  ? <span style={{ color: "var(--green)", fontWeight: 600 }}>✓ Activo</span>
                  : <span style={{ color: "var(--text-3)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sub-tab: Destacados ───────────────────────────────────────────────────────

function FeaturedTab() {
  const [rows, setRows] = useState<{ id: number; title: string; userName: string; featuredUntil: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, featured_until, profiles(name)")
        .eq("featured", true)
        .order("featured_until", { ascending: true });
      setRows((data ?? []).map((r: Record<string, unknown>) => ({
        id:           r.id as number,
        title:        r.title as string,
        userName:     ((r.profiles as Record<string, unknown>)?.name as string) ?? "—",
        featuredUntil: (r.featured_until as string) ?? "",
      })));
      setLoading(false);
    })();
  }, []);

  async function handleRemove(productId: number) {
    const { error } = await supabase.rpc("admin_unfeature_product", { product_id: productId });
    if (!error) {
      setRows(prev => prev.filter(r => r.id !== productId));
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Cargando...</div>;
  if (rows.length === 0) return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Sin publicaciones destacadas.</div>;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {["Publicación", "Vendedor", "Expira", ""].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const expired = r.featuredUntil && new Date(r.featuredUntil) < new Date();
            return (
              <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "11px 14px", fontWeight: 500 }}>
                  <Link href={`/producto/${r.id}`} style={{ color: "var(--green)" }}>{r.title}</Link>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--text-3)" }}>{r.userName}</td>
                <td style={{ padding: "11px 14px" }}>
                  {r.featuredUntil
                    ? <span style={{ color: expired ? "#dc2626" : "var(--text)" }}>
                        {new Date(r.featuredUntil).toLocaleDateString("es-AR")}
                        {expired && " (expirado)"}
                      </span>
                    : "—"}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <button
                    onClick={() => handleRemove(r.id)}
                    style={{ fontSize: 11, color: "#dc2626", background: "none", border: "1px solid #dc2626", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
