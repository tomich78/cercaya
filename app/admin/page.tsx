"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getCurrentUser } from "../lib/auth";
import { supabase } from "../lib/supabase";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

async function adminAction(action: string, userId?: string, productId?: number) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-email": ADMIN_EMAIL },
    body: JSON.stringify({ action, userId, productId }),
  });
  return res.ok;
}

type Tab = "dni" | "negocios" | "destacados" | "banners" | "usuarios";

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
      const u = await getCurrentUser();
      if (!u || u.email !== ADMIN_EMAIL) { router.replace("/"); return; }
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
              background: s.alert ? "#fef3c7" : "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.alert ? "#d97706" : "var(--text)", letterSpacing: -1 }}>{s.value}</div>
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
        </div>

        {tab === "dni"        && <DniTab acting={acting} setActing={setActing} onRefresh={loadStats} />}
        {tab === "negocios"   && <NegociosTab acting={acting} setActing={setActing} />}
        {tab === "destacados" && <DestacadosTab acting={acting} setActing={setActing} />}
        {tab === "banners"    && <BannersTab acting={acting} setActing={setActing} />}
        {tab === "usuarios"   && <UsuariosTab acting={acting} setActing={setActing} />}
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
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, location, is_business, dni_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []).map(r => ({
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
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", background: "#dbeafe", padding: "2px 7px", borderRadius: 4 }}>Negocio</span>
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
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>Mostrando hasta 100 usuarios más recientes.</div>
    </div>
  );
}

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
