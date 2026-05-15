"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getCurrentUser, type LocalUser } from "../../lib/auth";
import { getProductById, type LocalProduct } from "../../lib/storage";
import { getOrCreateConversation } from "../../lib/messages";
import { supabase } from "../../lib/supabase";

type PayMethod  = "efectivo" | "transferencia" | "mercadopago";
type ShipMethod = "retiro" | "delivery" | "cadete";

const PAY_LABELS: Record<PayMethod, string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia bancaria",
  mercadopago:   "Mercado Pago",
};

const SHIP_LABELS: Record<ShipMethod, string> = {
  retiro:   "Retiro en persona",
  delivery: "Envío por app (Uber / Rappi / PedidosYa)",
  cadete:   "Cadete / mensajería",
};

const SHIP_ICONS: Record<ShipMethod, string> = {
  retiro:   "🤝",
  delivery: "🛵",
  cadete:   "📦",
};

function buildMessage(
  product: LocalProduct,
  user: LocalUser,
  payMethod: PayMethod,
  shipMethod: ShipMethod,
  address: string,
): string {
  const lines = [
    "🛒 Reserva de producto",
    "─────────────────────",
    `📦 ${product.title}`,
    `💰 ${product.price}`,
    "",
    `💳 Pago: ${PAY_LABELS[payMethod]}`,
    `🚚 Envío: ${SHIP_LABELS[shipMethod]}`,
  ];

  if (shipMethod !== "retiro" && address.trim()) {
    lines.push(`📍 Dirección: ${address.trim()}`);
  }

  lines.push("");
  lines.push(`👤 ${user.name}`);
  if (user.phoneNumber) lines.push(`📱 ${user.phoneNumber}`);
  lines.push("");
  lines.push("¿Podemos coordinar los detalles?");

  return lines.join("\n");
}

// ── Provincias de Argentina ───────────────────────────────────

const PROVINCIAS = [
  { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
  { id: "06", nombre: "Buenos Aires" },
  { id: "10", nombre: "Catamarca" },
  { id: "14", nombre: "Córdoba" },
  { id: "18", nombre: "Corrientes" },
  { id: "22", nombre: "Chaco" },
  { id: "26", nombre: "Chubut" },
  { id: "30", nombre: "Entre Ríos" },
  { id: "34", nombre: "Formosa" },
  { id: "38", nombre: "Jujuy" },
  { id: "42", nombre: "La Pampa" },
  { id: "46", nombre: "La Rioja" },
  { id: "50", nombre: "Mendoza" },
  { id: "54", nombre: "Misiones" },
  { id: "58", nombre: "Neuquén" },
  { id: "62", nombre: "Río Negro" },
  { id: "66", nombre: "Salta" },
  { id: "70", nombre: "San Juan" },
  { id: "74", nombre: "San Luis" },
  { id: "78", nombre: "Santa Cruz" },
  { id: "82", nombre: "Santa Fe" },
  { id: "86", nombre: "Santiago del Estero" },
  { id: "90", nombre: "Tucumán" },
  { id: "94", nombre: "Tierra del Fuego" },
];

// ── Input de dirección estructurado ───────────────────────────
// Provincia (local) → Ciudad (Georef localidades) → Calle y número (libre)

type Localidad = { id: string; nombre: string };

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: "100%", padding: "9px 11px",
  border: `1px solid ${hasError ? "#dc2626" : "var(--border)"}`,
  borderRadius: 7, fontSize: 13,
  color: "var(--text)", background: "var(--bg)",
  outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", transition: "border-color 0.12s",
});

function AddressInput({
  onChange, error, onClearError,
}: {
  onChange:     (v: string) => void;
  error:        string;
  onClearError: () => void;
}) {
  const [provId,    setProvId]    = useState("");
  const [cityInput, setCityInput] = useState("");
  const [street,    setStreet]    = useState("");
  const [locs,      setLocs]      = useState<Localidad[]>([]);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [fetching,  setFetching]  = useState(false);
  const cityWrapRef = useRef<HTMLDivElement>(null);

  const provName = PROVINCIAS.find(p => p.id === provId)?.nombre ?? "";

  // Componer dirección completa y notificar al padre
  useEffect(() => {
    const parts = [street.trim(), cityInput.trim(), provName].filter(Boolean);
    onChange(parts.length >= 2 ? parts.join(", ") : "");
  }, [street, cityInput, provName, onChange]);

  // Buscar localidades via Georef
  useEffect(() => {
    if (cityInput.length < 2) { setLocs([]); setDropOpen(false); return; }
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const qs = `nombre=${encodeURIComponent(cityInput)}&max=8${provId ? `&provincia=${provId}` : ""}`;
        const r  = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${qs}`);
        const d  = await r.json() as { localidades?: Localidad[] };
        const list = d.localidades ?? [];
        setLocs(list);
        setDropOpen(list.length > 0);
      } catch { setLocs([]); }
      setFetching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [cityInput, provId]);

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node))
        setDropOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>

      {/* Paso 1: Provincia */}
      <select
        value={provId}
        onChange={e => { setProvId(e.target.value); setCityInput(""); setLocs([]); onClearError(); }}
        style={{ ...inputStyle(!!error && !provId), cursor: "pointer", appearance: "auto" as const }}
      >
        <option value="">Provincia…</option>
        {PROVINCIAS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>

      {/* Paso 2: Ciudad / localidad */}
      <div ref={cityWrapRef} style={{ position: "relative" }}>
        <div style={{ position: "relative" }}>
          <input
            value={cityInput}
            onChange={e => { setCityInput(e.target.value); setDropOpen(false); onClearError(); }}
            onFocus={() => { if (locs.length > 0) setDropOpen(true); }}
            placeholder={provId ? "Ciudad o localidad…" : "Primero elegí una provincia"}
            disabled={!provId}
            autoComplete="off"
            style={{
              ...inputStyle(!!error && !!provId && !cityInput),
              paddingRight: fetching ? 30 : 11,
              opacity: provId ? 1 : 0.5,
              borderRadius: dropOpen && locs.length > 0 ? "7px 7px 0 0" : 7,
            }}
          />
          {fetching && (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-3)", pointerEvents: "none" }}>⟳</div>
          )}
        </div>

        {dropOpen && locs.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0, zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)", borderTop: "none",
            borderRadius: "0 0 7px 7px",
            maxHeight: 200, overflowY: "auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
          }}>
            {locs.map((loc, i) => (
              <button
                key={loc.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); setCityInput(loc.nombre); setDropOpen(false); onClearError(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", background: "none", border: "none",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  fontSize: 12, color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {loc.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paso 3: Calle y número */}
      <input
        value={street}
        onChange={e => { setStreet(e.target.value); onClearError(); }}
        placeholder={cityInput ? "Calle y número, piso/depto (opcional)" : "Primero elegí tu ciudad"}
        disabled={!cityInput}
        style={{ ...inputStyle(!!error && !!cityInput && !street), opacity: cityInput ? 1 : 0.5 }}
      />

      {error && <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>}
    </div>
  );
}

// Selector de opción con ícono
function OptionBtn({
  selected, onClick, icon, label, sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "12px 14px",
        border: `1.5px solid ${selected ? "var(--green)" : "var(--border)"}`,
        borderRadius: 8,
        background: selected ? "var(--green-subtle)" : "var(--surface)",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.12s",
      }}
    >
      {/* Radio visual */}
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${selected ? "var(--green)" : "var(--border)"}`,
        background: selected ? "var(--green)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
      </div>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: selected ? 600 : 400, color: selected ? "var(--green)" : "var(--text)" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );
}

export default function ReservarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [user, setUser]       = useState<LocalUser | null>(null);
  const [product, setProduct] = useState<LocalProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  // Info del vendedor cargada al inicio
  const [sellerName,      setSellerName]      = useState("Vendedor");
  const [sellerInitials,  setSellerInitials]  = useState("VV");
  const [sellerMpEnabled, setSellerMpEnabled] = useState(false); // negocio activo + MP vinculado

  const [payMethod,  setPayMethod]  = useState<PayMethod>("transferencia");
  const [shipMethod, setShipMethod] = useState<ShipMethod>("retiro");
  const [address, setAddress]       = useState("");
  const [addrError, setAddrError]   = useState("");

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace(`/login?redirect=/reservar/${id}`); return; }

      const p = await getProductById(Number(id));
      if (!p || p.sold) { router.replace("/"); return; }

      // No se puede reservar el propio producto
      if (p.userId === u.id) { router.replace(`/producto/${id}`); return; }

      // No se pueden reservar productos de vendedores mock (sin UUID)
      if (!p.userId) { router.replace(`/producto/${id}`); return; }

      setUser(u);
      setProduct(p);

      // Cargar perfil del vendedor para nombre y verificar si tiene MP activo
      const { data: sp } = await supabase
        .from("profiles")
        .select("name, initials, is_business, business_name, business_paid, mp_access_token")
        .eq("id", p.userId)
        .single();

      if (sp) {
        const isBiz  = (sp.is_business as boolean) && (sp.business_paid as boolean);
        const name   = (isBiz && sp.business_name) ? (sp.business_name as string) : ((sp.name as string) ?? "Vendedor");
        setSellerName(name);
        setSellerInitials((sp.initials as string) ?? "VV");
        setSellerMpEnabled(isBiz && !!(sp.mp_access_token as string | null));
      }

      setLoading(false);
    })();
  }, [id, router]);

  async function handleConfirm() {
    if (!user || !product) return;

    if (shipMethod !== "retiro" && !address.trim()) {
      setAddrError("Ingresá tu dirección de entrega.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const conv = await getOrCreateConversation({
        productId:       product.id,
        productTitle:    product.title,
        productEmoji:    product.emoji,
        productBg:       product.bg,
        buyerId:         user.id,
        buyerName:       user.name,
        buyerInitials:   user.initials,
        sellerId:        product.userId!,
        sellerName,
        sellerInitials,
      });

      // Guardar borrador en sessionStorage para que el chat lo lea
      const draft = buildMessage(product, user, payMethod, shipMethod, address);
      sessionStorage.setItem(`estamosCerca_draft_${conv.id}`, draft);

      router.push(`/mensajes/${conv.id}`);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
      setSubmitting(false);
    }
  }

  if (loading) return <div><Navbar /></div>;
  if (!product || !user) return null;

  const needsAddress = shipMethod !== "retiro";
  const preview = buildMessage(product, user, payMethod, shipMethod, address);
  const coverImg = product.images?.[0];

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <Link href={`/producto/${product.id}`} style={{ fontSize: 13, color: "var(--text-3)", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
          ← Volver al producto
        </Link>

        <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
          Reservar producto
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>
          Elegí cómo querés pagar y recibir el producto. Se va a generar un mensaje para coordinar con el vendedor.
        </p>

        <div className="reservar-grid">

          {/* ── Columna izquierda: formulario ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, gridColumn: "1 / 2" }}>

            {/* Resumen del producto */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ width: 80, height: 80, flexShrink: 0 }}>
                {coverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImg} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: product.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                    {product.emoji}
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{product.title}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", letterSpacing: -0.3 }}>{product.price}</div>
                {product.condition && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{product.condition} · {product.location}</div>
                )}
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                ¿Cómo querés pagar?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sellerMpEnabled && (
                  <OptionBtn
                    selected={payMethod === "mercadopago"}
                    onClick={() => setPayMethod("mercadopago")}
                    icon="💳"
                    label="Mercado Pago"
                    sub="El vendedor te envía un link de pago seguro"
                  />
                )}
                <OptionBtn
                  selected={payMethod === "transferencia"}
                  onClick={() => setPayMethod("transferencia")}
                  icon="🏦"
                  label="Transferencia bancaria"
                  sub="CBU / CVU / Alias"
                />
                <OptionBtn
                  selected={payMethod === "efectivo"}
                  onClick={() => setPayMethod("efectivo")}
                  icon="💵"
                  label="Efectivo"
                  sub="Acordar en el momento"
                />
              </div>
            </div>

            {/* Método de envío */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                ¿Cómo lo recibís?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <OptionBtn
                  selected={shipMethod === "retiro"}
                  onClick={() => { setShipMethod("retiro"); setAddrError(""); }}
                  icon={SHIP_ICONS.retiro}
                  label="Retiro en persona"
                  sub="Coordinar punto de encuentro con el vendedor"
                />
                <OptionBtn
                  selected={shipMethod === "delivery"}
                  onClick={() => setShipMethod("delivery")}
                  icon={SHIP_ICONS.delivery}
                  label="Envío por app"
                  sub="Uber Flash / Rappi / PedidosYa — a tu cargo"
                />
                <OptionBtn
                  selected={shipMethod === "cadete"}
                  onClick={() => setShipMethod("cadete")}
                  icon={SHIP_ICONS.cadete}
                  label="Cadete / mensajería"
                  sub="Acordar costo con el vendedor"
                />
              </div>
            </div>

            {/* Dirección (solo si no es retiro) */}
            {needsAddress && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                  Dirección de entrega
                </label>
                <AddressInput
                  onChange={setAddress}
                  error={addrError}
                  onClearError={() => setAddrError("")}
                />
              </div>
            )}

            {error && (
              <div style={{ fontSize: 13, color: "var(--red)", background: "var(--red-subtle)", border: "1px solid var(--red-border)", borderRadius: 7, padding: "10px 12px" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              style={{
                background: "var(--green)", color: "#fff",
                border: "none", borderRadius: 8,
                padding: "13px", fontSize: 14, fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
                letterSpacing: -0.2,
                transition: "opacity 0.12s",
              }}
            >
              {submitting ? "Generando reserva..." : "Confirmar y enviar mensaje →"}
            </button>

            <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: -8 }}>
              El pago y la entrega se coordinan directamente con el vendedor.
            </p>
          </div>

          {/* ── Columna derecha: preview del mensaje ── */}
          <div style={{ gridColumn: "2 / 3" }} className="hide-mobile">
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Mensaje que se enviará
              </div>
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "16px",
              }}>
                {/* Burbuja de chat */}
                <div style={{
                  background: "var(--green)",
                  borderRadius: "12px 12px 4px 12px",
                  padding: "12px 15px",
                  color: "#fff",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {preview}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, textAlign: "right" }}>
                  Vos · ahora
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, lineHeight: 1.6 }}>
                Podés editar el mensaje antes de enviarlo en el chat.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
