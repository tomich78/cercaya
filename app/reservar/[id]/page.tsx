"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getCurrentUser, type LocalUser } from "../../lib/auth";
import { getProductById, type LocalProduct } from "../../lib/storage";
import { getOrCreateConversation } from "../../lib/messages";
import { supabase } from "../../lib/supabase";

type PayMethod  = "efectivo" | "transferencia";
type ShipMethod = "retiro" | "delivery" | "cadete";

const PAY_LABELS: Record<PayMethod, string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia bancaria",
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

      // Pre-rellenar dirección si el usuario tiene ubicación guardada
      if (u.location) setAddress(u.location);

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
      // Obtener info del vendedor desde profiles
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("name, initials, is_business, business_name")
        .eq("id", product.userId)
        .single();

      const isBusiness = (sellerProfile?.is_business as boolean | null) ?? false;
      const businessName = (sellerProfile?.business_name as string | null) ?? null;
      // Usar nombre de negocio si está activo
      const sellerName     = (isBusiness && businessName) ? businessName : ((sellerProfile?.name as string | null) ?? "Vendedor");
      const sellerInitials = (sellerProfile?.initials as string | null) ?? "VV";

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

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
                <input
                  value={address}
                  onChange={e => { setAddress(e.target.value); setAddrError(""); }}
                  placeholder="Ej: Av. Belgrano 1234, piso 3, CABA"
                  style={{
                    width: "100%", padding: "9px 11px",
                    border: `1px solid ${addrError ? "#dc2626" : "var(--border)"}`,
                    borderRadius: 7, fontSize: 13,
                    color: "var(--text)", background: "var(--bg)",
                    outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                {addrError && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{addrError}</div>}
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
                  Ingresá la dirección completa donde querés recibir el producto.
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "10px 12px" }}>
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
