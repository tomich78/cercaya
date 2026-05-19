"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { PRECIOS, LABELS, type TipoPago } from "../lib/pagos";

async function adminAction(action: string, userId?: string, productId?: number) {
  // Obtener el JWT de Supabase para autenticar la request en el servidor
  const { supabase: sb } = await import("../lib/supabase");
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;
  if (!token) return false;

  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action, userId, productId }),
  });
  return res.ok;
}

type Tab = "dni" | "negocios" | "destacados" | "banners" | "usuarios" | "precios" | "codigos";

interface DniRequest {
  id: string; name: string; email: string;
  dniNumber: string; dniDocSignedUrl: string; submittedAt: string;
}
interface BizRow {
  id: string; name: string; businessName: string;
  businessCategory: string; cuitVerified: boolean; paid: boolean; paidUntil: string;
}
interface FeatRow {
  id: number; title: string; userName: string; featuredUntil: string;
}
interface BannerRow {
  id: number; userId: string; userName: string; validUntil: string; paymentId: string;
}
interface UserRow {
  id: string; name: string; email: string; location: string;
  isBusiness: boolean; dniStatus: string; createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [tab,      setTab]      = useState<Tab>("dni");
  const [acting,   setActing]   = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingDni: 0, activeBusinesses: 0, featuredProducts: 0,
    totalProducts: 0, totalUsers: 0, activeBanners: 0,
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const res = await fetch("/api/admin", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const { isAdmin } = await res.json() as { isAdmin: boolean };
      if (!isAdmin) { router.replace("/"); return; }
      setReady(true);
      loadStats();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    const [
      { count: pendingDni },
      { count: activeBusinesses },
      { count: featuredProducts },
      { count: totalProducts },
      { count: totalUsers },
      { count: activeBanners },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("dni_status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_business", true),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("featured", true),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("banners").select("*", { count: "exact", head: true }).eq("active", true),
    ]);
    setStats({
      pendingDni:       pendingDni       ?? 0,
      activeBusinesses: activeBusinesses ?? 0,
      featuredProducts: featuredProducts ?? 0,
      totalProducts:    totalProducts    ?? 0,
      totalUsers:       totalUsers       ?? 0,
      activeBanners:    activeBanners    ?? 0,
    });
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? "var(--green-subtle)" : "none",
    color: active ? "var(--green)" : "var(--text-3)",
    border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
    cursor: "pointer", whiteSpace: "nowrap" as const,
  });

  if (!ready) return <div><Navbar /></div>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>Panel de administración</h1>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>EstamosCerca — vista interna</div>
          </div>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "DNI pendientes",  value: stats.pendingDni,       alert: stats.pendingDni > 0 },
            { label: "Negocios activos",value: stats.activeBusinesses, alert: false },
            { label: "Destacados",      value: stats.featuredProducts, alert: false },
            { label: "Banners activos", value: stats.activeBanners,    alert: false },
            { label: "Publicaciones",   value: stats.totalProducts,    alert: false },
            { label: "Usuarios",        value: stats.totalUsers,       alert: false },
          ].map(s => (
            <div key={s.label} style={{
              background: s.alert ? "var(--yellow-subtle)" : "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.alert ? "var(--amber)" : "var(--text)", letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          <button style={tabStyle(tab === "dni")}         onClick={() => setTab("dni")}>
            DNI {stats.pendingDni > 0 && <span style={{ background: "#d97706", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 5 }}>{stats.pendingDni}</span>}
          </button>
          <button style={tabStyle(tab === "negocios")}    onClick={() => setTab("negocios")}>Negocios</button>
          <button style={tabStyle(tab === "destacados")}  onClick={() => setTab("destacados")}>Destacados</button>
          <button style={tabStyle(tab === "banners")}     onClick={() => setTab("banners")}>Banners</button>
          <button style={tabStyle(tab === "usuarios")}    onClick={() => setTab("usuarios")}>Usuarios</button>
          <button style={tabStyle(tab === "precios")}     onClick={() => setTab("precios")}>💰 Precios</button>
          <button style={tabStyle(tab === "codigos")}     onClick={() => setTab("codigos")}>🎟️ Códigos</button>
        </div>

        {tab === "dni"        && <DniTab acting={acting} setActing={setActing} onRefresh={loadStats} />}
        {tab === "negocios"   && <NegociosTab acting={acting} setActing={setActing} />}
        {tab === "destacados" && <DestacadosTab acting={acting} setActing={setActing} />}
        {tab === "banners"    && <BannersTab acting={acting} setActing={setActing} />}
        {tab === "usuarios"   && <UsuariosTab acting={acting} setActing={setActing} />}
        {tab === "precios"    && <PreciosTab />}
        {tab === "codigos"    && <CodigosTab />}
      </div>
    </div>
  );
}

// ── DNI ──────────────────────────────────────────────────────────────────────

function DniTab({ acting, setActing, onRefresh }: { acting: string | null; setActing: (v: string | null) => void; onRefresh: () => void }) {
  const [rows, setRows] = useState<DniRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, dni_number, dni_doc_url, updated_at")
      .eq("dni_status", "pending")
      .order("updated_at", { ascending: true });
    const enriched = await Promise.all((data ?? []).map(async row => {
      let signedUrl = "";
      if (row.dni_doc_url) {
        const { data: s } = await supabase.storage.from("dni-docs").createSignedUrl(row.dni_doc_url as string, 600);
        signedUrl = s?.signedUrl ?? "";
      }
      return { id: row.id as string, name: row.name as string, email: (row.email as string) ?? "", dniNumber: (row.dni_number as string) ?? "—", dniDocSignedUrl: signedUrl, submittedAt: row.updated_at as string };
    }));
    setRows(enriched);
    setLoading(false);
  }

  async function handle(userId: string, action: "admin_approve_dni" | "admin_reject_dni") {
    setActing(userId);
    await supabase.rpc(action, { target_user_id: userId });
    setRows(prev => prev.filter(r => r.id !== userId));
    onRefresh();
    setActing(null);
  }

  if (loading) return <Loader />;
  if (!rows.length) return <Empty icon="✅" text="Sin solicitudes pendientes" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map(req => (
        <div key={req.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          {req.dniDocSignedUrl
            ? <a href={req.dniDocSignedUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={req.dniDocSignedUrl} alt="DNI" style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4, textAlign: "center" }}>Ver imagen →</div>
              </a>
            : <div style={{ width: 160, height: 100, borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-3)" }}>Sin imagen</div>
          }
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{req.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 2 }}>{req.email}</div>
            <div style={{ fontSize: 13, marginBottom: 2 }}>DNI <strong>{req.dniNumber}</strong></div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
              {new Date(req.submittedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <ActionBtn label="✓ Aprobar" color="green"  loading={acting === req.id} onClick={() => handle(req.id, "admin_approve_dni")} />
              <ActionBtn label="✕ Rechazar" color="red"   loading={acting === req.id} onClick={() => handle(req.id, "admin_reject_dni")} />
              <Link href={`/vendedor/${req.id}`} target="_blank" style={{ padding: "7px 12px", fontSize: 12, color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: 6 }}>Ver perfil</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Negocios ─────────────────────────────────────────────────────────────────

function NegociosTab({ acting, setActing }: { acting: string | null; setActing: (v: string | null) => void }) {
  const [rows, setRows] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, business_name, business_category, business_cuit_verified, business_paid, business_paid_until")
        .eq("is_business", true)
        .order("created_at", { ascending: false });
      setRows((data ?? []).map(r => ({
        id: r.id as string, name: r.name as string,
        businessName: (r.business_name as string) ?? "—",
        businessCategory: (r.business_category as string) ?? "—",
        cuitVerified: (r.business_cuit_verified as boolean) ?? false,
        paid: (r.business_paid as boolean) ?? false,
        paidUntil: (r.business_paid_until as string) ?? "",
      })));
      setLoading(false);
    })();
  }, []);

  async function cancelBusiness(userId: string, name: string) {
    if (!confirm(`¿Cancelar el Modo Negocio de "${name}"? Se desactivará de inmediato.`)) return;
    setActing(userId);
    const ok = await adminAction("cancel_business", userId);
    if (ok) setRows(prev => prev.filter(r => r.id !== userId));
    setActing(null);
  }

  async function activateBusiness(userId: string, name: string) {
    if (!confirm(`¿Activar el Modo Negocio de "${name}" por 30 días?`)) return;
    setActing(userId);
    const ok = await adminAction("activate_business", userId);
    if (ok) setRows(prev => prev.map(r => r.id === userId ? { ...r, paid: true } : r));
    setActing(null);
  }

  if (loading) return <Loader />;
  if (!rows.length) return <Empty icon="🏪" text="Sin negocios registrados." />;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {["Titular", "Negocio", "Rubro", "CUIT", "Estado", "Expira", "Acciones"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                <Link href={`/vendedor/${r.id}`} style={{ color: "var(--green)" }}>{r.name}</Link>
              </td>
              <td style={{ padding: "10px 12px" }}>{r.businessName}</td>
              <td style={{ padding: "10px 12px", color: "var(--text-3)" }}>{r.businessCategory}</td>
              <td style={{ padding: "10px 12px" }}>
                {r.cuitVerified ? <span style={{ color: "var(--green)", fontWeight: 600 }}>✓</span> : <span style={{ color: "var(--text-3)" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {r.paid
                  ? <span style={{ color: "var(--green)", fontWeight: 600 }}>✓ Activo</span>
                  : <span style={{ color: "var(--text-3)" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-3)" }}>
                {r.paidUntil ? new Date(r.paidUntil).toLocaleDateString("es-AR") : "—"}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {r.paid
                    ? <ActionBtn label="Cancelar" color="red" small loading={acting === r.id} onClick={() => cancelBusiness(r.id, r.name)} />
                    : <ActionBtn label="Activar" color="green" small loading={acting === r.id} onClick={() => activateBusiness(r.id, r.name)} />
                  }
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Destacados ────────────────────────────────────────────────────────────────

function DestacadosTab({ acting, setActing }: { acting: string | null; setActing: (v: string | null) => void }) {
  const [rows, setRows] = useState<FeatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, featured_until, profiles(name)")
        .eq("featured", true)
        .order("featured_until", { ascending: true });
      setRows((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as number, title: r.title as string,
        userName: ((r.profiles as Record<string, unknown>)?.name as string) ?? "—",
        featuredUntil: (r.featured_until as string) ?? "",
      })));
      setLoading(false);
    })();
  }, []);

  async function unfeature(productId: number, title: string) {
    if (!confirm(`¿Quitar el destacado de "${title}"?`)) return;
    setActing(String(productId));
    const ok = await adminAction("unfeature_product", undefined, productId);
    if (ok) setRows(prev => prev.filter(r => r.id !== productId));
    setActing(null);
  }

  if (loading) return <Loader />;
  if (!rows.length) return <Empty icon="⭐" text="Sin publicaciones destacadas." />;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {["Publicación", "Vendedor", "Expira", ""].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const expired = r.featuredUntil && new Date(r.featuredUntil) < new Date();
            return (
              <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                  <Link href={`/producto/${r.id}`} style={{ color: "var(--green)" }}>{r.title}</Link>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-3)" }}>{r.userName}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ color: expired ? "#dc2626" : "var(--text)" }}>
                    {r.featuredUntil ? new Date(r.featuredUntil).toLocaleDateString("es-AR") : "—"}
                    {expired && " ⚠️"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <ActionBtn label="Quitar" color="red" small loading={acting === String(r.id)} onClick={() => unfeature(r.id, r.title)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Banners ───────────────────────────────────────────────────────────────────

function BannersTab({ acting, setActing }: { acting: string | null; setActing: (v: string | null) => void }) {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("banners")
        .select("id, user_id, valid_until, payment_id, profiles(name)")
        .eq("active", true)
        .order("valid_until", { ascending: true });
      setRows((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        userId: r.user_id as string,
        userName: ((r.profiles as Record<string, unknown>)?.name as string) ?? "—",
        validUntil: (r.valid_until as string) ?? "",
        paymentId: (r.payment_id as string) ?? "—",
      })));
      setLoading(false);
    })();
  }, []);

  async function deactivate(bannerId: number, userName: string) {
    if (!confirm(`¿Desactivar el banner de "${userName}"?`)) return;
    setActing(String(bannerId));
    const ok = await adminAction("deactivate_banner", undefined, bannerId);
    if (ok) setRows(prev => prev.filter(r => r.id !== bannerId));
    setActing(null);
  }

  if (loading) return <Loader />;
  if (!rows.length) return <Empty icon="📢" text="Sin banners activos." />;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {["Usuario", "Expira", "Pago ID", ""].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const expired = r.validUntil && new Date(r.validUntil) < new Date();
            return (
              <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                  <Link href={`/vendedor/${r.userId}`} style={{ color: "var(--green)" }}>{r.userName}</Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ color: expired ? "#dc2626" : "var(--text)" }}>
                    {r.validUntil ? new Date(r.validUntil).toLocaleDateString("es-AR") : "—"}
                    {expired && " ⚠️"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--text-3)" }}>{r.paymentId}</td>
                <td style={{ padding: "10px 12px" }}>
                  <ActionBtn label="Desactivar" color="red" small loading={acting === String(r.id)} onClick={() => deactivate(r.id, r.userName)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

function UsuariosTab({ acting, setActing }: { acting: string | null; setActing: (v: string | null) => void }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/admin?action=users", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const json = await res.json() as { users?: Record<string, unknown>[] };
      setRows((json.users ?? []).map(r => ({
        id: r.id as string, name: r.name as string,
        email: (r.email as string) ?? "—",
        location: (r.location as string) ?? "—",
        isBusiness: (r.is_business as boolean) ?? false,
        dniStatus: (r.dni_status as string) ?? "none",
        createdAt: r.created_at as string,
      })));
      setLoading(false);
    })();
  }, []);

  async function deleteUser(userId: string) {
    if (!confirm("¿Seguro que querés eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setActing(userId);
    const ok = await adminAction("delete_user", userId);
    if (ok) setRows(prev => prev.filter(r => r.id !== userId));
    setActing(null);
  }

  const filtered = rows.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, marginBottom: 12, background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
      />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Nombre", "Email", "Zona", "Tipo", "DNI", "Registro", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, fontWeight: 600, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                  <Link href={`/vendedor/${r.id}`} style={{ color: "var(--green)" }}>{r.name}</Link>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-3)", fontSize: 12 }}>{r.email}</td>
                <td style={{ padding: "10px 12px", color: "var(--text-3)", fontSize: 12 }}>{r.location}</td>
                <td style={{ padding: "10px 12px" }}>
                  {r.isBusiness
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)", background: "var(--blue-subtle)", padding: "2px 7px", borderRadius: 4 }}>Negocio</span>
                    : <span style={{ fontSize: 11, color: "var(--text-3)" }}>Usuario</span>}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {r.dniStatus === "approved" && <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 11 }}>✓</span>}
                  {r.dniStatus === "pending"  && <span style={{ color: "#d97706", fontSize: 11 }}>Pendiente</span>}
                  {r.dniStatus === "none"     && <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--text-3)" }}>
                  {new Date(r.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <ActionBtn label="Eliminar" color="red" small loading={acting === r.id} onClick={() => deleteUser(r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>Mostrando hasta 200 usuarios más recientes.</div>
    </div>
  );
}

// ── Precios ───────────────────────────────────────────────────────────────────

const PRECIO_KEYS = Object.keys(PRECIOS) as TipoPago[];

const PRECIO_DESCRIPTIONS: Record<TipoPago, { emoji: string; hint: string }> = {
  destacar_7:   { emoji: "⭐", hint: "Publicación aparece primera en el feed — 7 días" },
  destacar_30:  { emoji: "⭐", hint: "Publicación aparece primera en el feed — 30 días" },
  negocio_mes:  { emoji: "🏪", hint: "Perfil Modo Negocio con nombre, categoría y verificación — 1 mes" },
  banner_7:     { emoji: "🎯", hint: "Slot publicitario en el feed — 7 días" },
};

function PreciosTab() {
  const [values,  setValues]  = useState<Record<TipoPago, string>>(() =>
    Object.fromEntries(PRECIO_KEYS.map(k => [k, String(PRECIOS[k])])) as Record<TipoPago, string>
  );
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // Cargar precios actuales desde la DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_config").select("key, value").in("key", PRECIO_KEYS);
      if (data && data.length > 0) {
        setValues(prev => {
          const next = { ...prev };
          for (const row of data) {
            if (row.key in next) next[row.key as TipoPago] = String(row.value);
          }
          return next;
        });
      }
      setLoading(false);
    })();
  }, []);

  function handleChange(key: TipoPago, raw: string) {
    setValues(v => ({ ...v, [key]: raw.replace(/\D/g, "") }));
    setErrors(e => ({ ...e, [key]: "" }));
    setSaved(false);
  }

  async function handleSave() {
    // Validar
    const errs: Record<string, string> = {};
    for (const key of PRECIO_KEYS) {
      const n = Number(values[key]);
      if (!values[key] || isNaN(n) || n <= 0) errs[key] = "Ingresá un valor válido mayor a 0";
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setSaving(false); return; }

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        action: "update_precios",
        precios: Object.fromEntries(PRECIO_KEYS.map(k => [k, Number(values[k])])),
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const defaultVal = (key: TipoPago) => String(PRECIOS[key]);
  const hasChanges = PRECIO_KEYS.some(k => values[k] !== defaultVal(k));

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "var(--bg)", borderBottom: "1px solid var(--border)",
          padding: "14px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Precios de suscripciones</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Valores en pesos argentinos (ARS). Se aplican a los próximos pagos.
            </div>
          </div>
          {saved && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: "var(--green)",
              background: "var(--green-subtle)", border: "1px solid #c5e8dc",
              borderRadius: 6, padding: "4px 10px",
            }}>
              ✓ Guardado
            </span>
          )}
        </div>

        {/* Rows */}
        {PRECIO_KEYS.map((key, i) => {
          const meta    = PRECIO_DESCRIPTIONS[key];
          const current = Number(values[key]);
          const original = PRECIOS[key];
          const changed  = current !== original && !!values[key];

          return (
            <div
              key={key}
              style={{
                padding: "16px 18px",
                borderBottom: i < PRECIO_KEYS.length - 1 ? "1px solid var(--border)" : "none",
                background: changed ? "rgba(26,171,130,0.03)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                {/* Emoji */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {meta.emoji}
                </div>

                {/* Info + input */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{LABELS[key]}</div>
                    {changed && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, padding: "1px 6px", borderRadius: 3, background: "var(--green-subtle)", color: "var(--green)", border: "1px solid #c5e8dc" }}>
                        Modificado
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>{meta.hint}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Input de precio */}
                    <div style={{ position: "relative", flex: 1, maxWidth: 160 }}>
                      <span style={{
                        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                        fontSize: 14, fontWeight: 600, color: "var(--text-3)",
                      }}>$</span>
                      <input
                        value={values[key]}
                        onChange={e => handleChange(key, e.target.value)}
                        inputMode="numeric"
                        placeholder={defaultVal(key)}
                        style={{
                          width: "100%",
                          padding: "8px 10px 8px 24px",
                          border: `1px solid ${errors[key] ? "#dc2626" : changed ? "var(--green)" : "var(--border)"}`,
                          borderRadius: 6, fontSize: 14, fontWeight: 600,
                          color: "var(--text)", background: "var(--bg)",
                          outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box" as const,
                        }}
                      />
                    </div>

                    {/* Preview formatted */}
                    {values[key] && (
                      <div style={{ fontSize: 13, color: "var(--text-3)", whiteSpace: "nowrap" as const }}>
                        = <strong style={{ color: "var(--text)" }}>
                          ${Number(values[key]).toLocaleString("es-AR")}
                        </strong>
                      </div>
                    )}

                    {/* Reset al default */}
                    {changed && (
                      <button
                        onClick={() => { setValues(v => ({ ...v, [key]: defaultVal(key) })); setSaved(false); }}
                        title="Volver al valor por defecto"
                        style={{
                          fontSize: 11, color: "var(--text-3)", background: "none",
                          border: "1px solid var(--border)", borderRadius: 5,
                          padding: "5px 8px", cursor: "pointer", whiteSpace: "nowrap" as const,
                        }}
                      >
                        ↩ Reset
                      </button>
                    )}
                  </div>
                  {errors[key] && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors[key]}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{
          background: "var(--bg)", borderTop: "1px solid var(--border)",
          padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
            ⚠️ Los precios vigentes se aplican a nuevas compras. Los pagos ya procesados no se ven afectados.
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              padding: "8px 20px", borderRadius: 6, border: "none",
              background: hasChanges && !saving ? "var(--green)" : "var(--border)",
              color: hasChanges && !saving ? "#fff" : "var(--text-3)",
              fontSize: 13, fontWeight: 600, cursor: saving || !hasChanges ? "default" : "pointer",
              flexShrink: 0, transition: "all 0.12s",
            }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, lineHeight: 1.6 }}>
        Valores por defecto del código:{" "}
        {PRECIO_KEYS.map(k => `${LABELS[k]}: $${PRECIOS[k].toLocaleString("es-AR")}`).join(" · ")}
      </div>
    </div>
  );
}

// ── Códigos promocionales ─────────────────────────────────────────────────────

interface PromoRow {
  code: string; note: string | null; uses: number; maxUses: number | null;
  durationDays: number; expiresAt: string | null; active: boolean; createdAt: string;
}

const BLANK_FORM = { code: "", note: "", maxUses: "", durationDays: "30", expiresAt: "" };

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function promoAction(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "Sin sesión" };
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json() as Record<string, unknown>;
  return { ok: res.ok, error: json.error as string | undefined };
}

function CodigosTab() {
  const [rows,       setRows]       = useState<PromoRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [formErr,    setFormErr]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acting,     setActing]     = useState<string | null>(null);
  const [copied,     setCopied]     = useState<string | null>(null);
  // Vista de usos de un código
  const [usesModal,  setUsesModal]  = useState<{ code: string; uses: PromoUseRow[] } | null>(null);

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    const { data } = await supabase
      .from("promo_codes")
      .select("code, note, uses, max_uses, duration_days, expires_at, active, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []).map(r => ({
      code:         r.code as string,
      note:         r.note as string | null,
      uses:         (r.uses as number) ?? 0,
      maxUses:      r.max_uses as number | null,
      durationDays: (r.duration_days as number) ?? 30,
      expiresAt:    r.expires_at as string | null,
      active:       (r.active as boolean) ?? false,
      createdAt:    r.created_at as string,
    })));
    setLoading(false);
  }

  async function handleCreate() {
    const code = form.code.trim().toUpperCase() || genCode();
    if (!code) { setFormErr("Ingresá un código"); return; }
    setSubmitting(true);
    setFormErr("");
    const { ok, error } = await promoAction("create_promo_code", {
      promoCode: {
        code,
        note:         form.note.trim() || null,
        maxUses:      form.maxUses ? Number(form.maxUses) : null,
        durationDays: Number(form.durationDays) || 30,
        expiresAt:    form.expiresAt || null,
      },
    });
    setSubmitting(false);
    if (!ok) { setFormErr(error ?? "Error al crear"); return; }
    setForm(BLANK_FORM);
    setShowForm(false);
    await loadCodes();
  }

  async function handleToggle(code: string, active: boolean) {
    setActing(code);
    await promoAction(active ? "deactivate_promo_code" : "reactivate_promo_code", { code });
    setRows(prev => prev.map(r => r.code === code ? { ...r, active: !active } : r));
    setActing(null);
  }

  async function handleDelete(code: string) {
    if (!confirm(`¿Eliminar el código "${code}"? También se borrarán sus usos registrados.`)) return;
    setActing(code);
    await promoAction("delete_promo_code", { code });
    setRows(prev => prev.filter(r => r.code !== code));
    setActing(null);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code).catch(() => null);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  async function showUses(code: string) {
    const { data } = await supabase
      .from("promo_code_uses")
      .select("user_id, used_at, profiles(name, email)")
      .eq("code", code)
      .order("used_at", { ascending: false });
    setUsesModal({
      code,
      uses: (data ?? []).map(r => ({
        userId:  r.user_id as string,
        usedAt:  r.used_at as string,
        name:    ((r.profiles as unknown as Record<string, unknown>)?.name as string) ?? "—",
        email:   ((r.profiles as unknown as Record<string, unknown>)?.email as string) ?? "—",
      })),
    });
  }

  const now = new Date();

  if (loading) return <Loader />;

  return (
    <div>
      {/* Header + botón crear */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {rows.length === 0 ? "Sin códigos creados todavía." : `${rows.length} código${rows.length !== 1 ? "s" : ""}`}
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setFormErr(""); setForm(BLANK_FORM); }}
          style={{
            padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: showForm ? "var(--surface)" : "var(--green)",
            color: showForm ? "var(--text-2)" : "#fff",
            border: "1px solid", borderColor: showForm ? "var(--border)" : "var(--green)",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancelar" : "+ Crear código"}
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "18px 18px 14px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 14 }}>
            Nuevo código
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>

            {/* Código */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>
                Código <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(vacío = auto)</span>
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                  placeholder="Ej: CERCAYA30"
                  style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--bg)", color: "var(--text)", outline: "none", fontFamily: "monospace", letterSpacing: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, code: genCode() }))}
                  title="Generar aleatorio"
                  style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", cursor: "pointer", fontSize: 14 }}
                >🎲</button>
              </div>
            </div>

            {/* Nota interna */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>Nota interna</label>
              <input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ej: Flyer campaña enero 2025"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>

            {/* Duración */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>Duración (días)</label>
              <input
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: e.target.value.replace(/\D/g, "") }))}
                inputMode="numeric"
                placeholder="30"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>

            {/* Usos máximos */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>
                Usos máx. <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(vacío = ilimitado)</span>
              </label>
              <input
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value.replace(/\D/g, "") }))}
                inputMode="numeric"
                placeholder="Ilimitado"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>

            {/* Vencimiento */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 4 }}>
                Vence el <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--bg)", color: "var(--text)", outline: "none" }}
              />
            </div>
          </div>

          {formErr && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 10 }}>{formErr}</div>}

          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCreate}
              disabled={submitting}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none",
                background: submitting ? "var(--border)" : "var(--green)",
                color: submitting ? "var(--text-3)" : "#fff",
                fontSize: 13, fontWeight: 600, cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Creando..." : "Crear código"}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de códigos */}
      {rows.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {["Código", "Nota", "Usos", "Duración", "Vence", "Estado", ""].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const expired  = !!r.expiresAt && new Date(r.expiresAt) < now;
                const full     = r.maxUses !== null && r.uses >= r.maxUses;
                const isLast   = i === rows.length - 1;
                return (
                  <tr key={r.code} style={{ borderBottom: isLast ? "none" : "1px solid var(--border)", opacity: !r.active ? 0.55 : 1 }}>

                    {/* Código */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, fontSize: 13 }}>{r.code}</span>
                        <button
                          onClick={() => copyCode(r.code)}
                          title="Copiar"
                          style={{ padding: "2px 6px", fontSize: 10, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", cursor: "pointer", color: copied === r.code ? "var(--green)" : "var(--text-3)" }}
                        >
                          {copied === r.code ? "✓" : "📋"}
                        </button>
                      </div>
                    </td>

                    {/* Nota */}
                    <td style={{ padding: "10px 12px", color: "var(--text-3)", fontSize: 12, maxWidth: 180 }}>
                      {r.note ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>

                    {/* Usos */}
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => r.uses > 0 ? showUses(r.code) : null}
                        style={{
                          background: "none", border: "none", padding: 0,
                          cursor: r.uses > 0 ? "pointer" : "default",
                          fontSize: 13,
                          color: full ? "#dc2626" : r.uses > 0 ? "var(--green)" : "var(--text-3)",
                          fontWeight: r.uses > 0 ? 600 : 400,
                          textDecoration: r.uses > 0 ? "underline" : "none",
                        }}
                      >
                        {r.uses}{r.maxUses !== null ? `/${r.maxUses}` : ""}
                        {full && " ⚠️"}
                      </button>
                    </td>

                    {/* Duración */}
                    <td style={{ padding: "10px 12px", color: "var(--text-3)", fontSize: 12 }}>
                      {r.durationDays} días
                    </td>

                    {/* Vence */}
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {r.expiresAt
                        ? <span style={{ color: expired ? "#dc2626" : "var(--text)" }}>
                            {new Date(r.expiresAt).toLocaleDateString("es-AR")}{expired && " ⚠️"}
                          </span>
                        : <span style={{ color: "var(--text-3)" }}>Sin vto.</span>
                      }
                    </td>

                    {/* Estado */}
                    <td style={{ padding: "10px 12px" }}>
                      {r.active
                        ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", background: "var(--green-subtle)", padding: "2px 8px", borderRadius: 4, border: "1px solid #c5e8dc" }}>Activo</span>
                        : <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>Inactivo</span>
                      }
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <ActionBtn
                          label={r.active ? "Desactivar" : "Activar"}
                          color={r.active ? "red" : "green"}
                          small
                          loading={acting === r.code}
                          onClick={() => handleToggle(r.code, r.active)}
                        />
                        <ActionBtn
                          label="Eliminar"
                          color="red"
                          small
                          loading={acting === r.code}
                          onClick={() => handleDelete(r.code)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && !showForm && (
        <Empty icon="🎟️" text="Sin códigos creados. Creá el primero con el botón de arriba." />
      )}

      {/* Modal de usos */}
      {usesModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16,
          }}
          onClick={() => setUsesModal(null)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 20, maxWidth: 480, width: "100%",
              maxHeight: "80vh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Usos del código</div>
                <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, letterSpacing: 1, color: "var(--green)", marginTop: 2 }}>{usesModal.code}</div>
              </div>
              <button onClick={() => setUsesModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-3)", lineHeight: 1 }}>×</button>
            </div>
            {usesModal.uses.length === 0
              ? <div style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "2rem 0" }}>Sin usos registrados</div>
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Usuario", "Email", "Fecha"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usesModal.uses.map((u, i) => (
                      <tr key={i} style={{ borderBottom: i < usesModal.uses.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 500 }}>
                          <Link href={`/vendedor/${u.userId}`} style={{ color: "var(--green)" }}>{u.name}</Link>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-3)" }}>{u.email}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-3)" }}>
                          {new Date(u.usedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

interface PromoUseRow { userId: string; usedAt: string; name: string; email: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Loader() {
  return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "2rem", textAlign: "center" }}>Cargando...</div>;
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{text}</div>
    </div>
  );
}

function ActionBtn({ label, color, small, loading, onClick }: {
  label: string; color: "green" | "red"; small?: boolean;
  loading: boolean; onClick: () => void;
}) {
  const isGreen = color === "green";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: small ? "4px 10px" : "7px 14px",
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        background: loading ? "var(--border)" : isGreen ? "var(--green)" : "none",
        color: loading ? "var(--text-3)" : isGreen ? "#fff" : "#dc2626",
        border: `1px solid ${isGreen ? "var(--green)" : "#dc2626"}`,
        borderRadius: 5,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "opacity 0.1s",
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}
