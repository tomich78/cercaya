"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getCurrentUser } from "../../lib/auth";
import { getProductById, updateProduct } from "../../lib/storage";

const FEATURED_PRICE   = "$2.999";
const FEATURED_DAYS    = 30;

export default function DestacarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [productTitle, setProductTitle] = useState("");
  const [productEmoji, setProductEmoji] = useState("📦");
  const [ready,  setReady]  = useState(false);
  const [step,   setStep]   = useState<"pricing" | "paying" | "done">("pricing");

  // Campos de tarjeta
  const [cardNum,  setCardNum]  = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp,  setCardExp]  = useState("");
  const [cardCvv,  setCardCvv]  = useState("");
  const [payErr,   setPayErr]   = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace(`/login?redirect=/destacar/${id}`); return; }
      const p = await getProductById(Number(id));
      if (!p || p.userId !== u.id) { router.replace("/perfil"); return; }
      if (p.featured) { setStep("done"); }
      setProductTitle(p.title);
      setProductEmoji(p.emoji);
      setReady(true);
    })();
  }, [id, router]);

  async function handlePay() {
    setPayErr("");
    const digitsOnly = cardNum.replace(/\s/g, "");
    if (digitsOnly.length < 16) { setPayErr("Número de tarjeta inválido."); return; }
    if (!cardName.trim())       { setPayErr("Ingresá el nombre del titular."); return; }
    if (cardExp.length < 5)     { setPayErr("Fecha de vencimiento inválida."); return; }
    if (cardCvv.length < 3)     { setPayErr("CVV inválido."); return; }

    setPayLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    const until = new Date();
    until.setDate(until.getDate() + FEATURED_DAYS);
    await updateProduct(Number(id), { featured: true, featuredUntil: until.toISOString() });
    setPayLoading(false);
    setStep("done");
  }

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

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>
              ¡Publicación destacada!
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6 }}>
              Tu publicación aparece primero en el grid durante {FEATURED_DAYS} días con el ribbon dorado de destacado.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href={`/producto/${id}`} style={{
                background: "var(--green)", color: "#fff", borderRadius: 6,
                padding: "9px 18px", fontSize: 13, fontWeight: 500,
              }}>
                Ver publicación
              </Link>
              <Link href="/perfil" style={{
                background: "var(--surface)", color: "var(--text-2)", borderRadius: 6,
                padding: "9px 18px", fontSize: 13, fontWeight: 400,
                border: "1px solid var(--border)",
              }}>
                Ir a mi perfil
              </Link>
            </div>
          </div>
        )}

        {/* ── PRICING ── */}
        {step === "pricing" && (
          <div>
            <div style={{
              border: "2px solid #f59e0b", borderRadius: 10,
              padding: "20px", marginBottom: 14,
              background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 8 }}>
                ⭐ Publicación Destacada
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: "var(--text)" }}>{FEATURED_PRICE}</span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/ {FEATURED_DAYS} días</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  "Aparece primero en el grid de resultados",
                  "Ribbon dorado ⭐ visible en la tarjeta",
                  "Mayor visibilidad en búsquedas y categorías",
                  `Activo durante ${FEATURED_DAYS} días corridos`,
                ].map(t => (
                  <div key={t} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                    <span style={{ color: "#d97706", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("paying")}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(90deg, #f59e0b, #d97706)",
                color: "#fff", border: "none", borderRadius: 6,
                fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: -0.1,
              }}
            >
              ⭐ Destacar por {FEATURED_PRICE}
            </button>
            <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>
              Pago único · Se activa de inmediato
            </div>
          </div>
        )}

        {/* ── PAYING ── */}
        {step === "paying" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              🔒 Pago seguro
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>— modo demo</span>
            </div>

            {/* Tarjeta visual */}
            <div style={{
              background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
              borderRadius: 12, padding: "18px 20px", marginBottom: 16,
              color: "#fff", minHeight: 90,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 16, letterSpacing: 3, fontWeight: 600, fontFamily: "monospace" }}>
                {cardNum || "•••• •••• •••• ••••"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.85, fontSize: 12 }}>
                <span>{cardName || "NOMBRE APELLIDO"}</span>
                <span>{cardExp || "MM/AA"}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Número de tarjeta</label>
                <input value={cardNum}
                  onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setCardNum(v.replace(/(.{4})/g, "$1 ").trim()); setPayErr(""); }}
                  placeholder="1234 5678 9012 3456" inputMode="numeric"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", letterSpacing: 2, boxSizing: "border-box" as const }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Nombre en la tarjeta</label>
                <input value={cardName}
                  onChange={e => { setCardName(e.target.value.toUpperCase()); setPayErr(""); }}
                  placeholder="NOMBRE APELLIDO"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", textTransform: "uppercase" as const, boxSizing: "border-box" as const }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Vencimiento</label>
                  <input value={cardExp}
                    onChange={e => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length > 2) v = v.slice(0,2)+"/"+v.slice(2); setCardExp(v); setPayErr(""); }}
                    placeholder="MM/AA" inputMode="numeric"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
                  />
                </div>
                <div style={{ width: 90 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>CVV</label>
                  <input value={cardCvv}
                    onChange={e => { setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); setPayErr(""); }}
                    placeholder="123" inputMode="numeric" type="password"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
                  />
                </div>
              </div>
            </div>

            {payErr && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 10, padding: "7px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>{payErr}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={handlePay} disabled={payLoading} style={{
                flex: 2, padding: "11px",
                background: payLoading ? "var(--border)" : "linear-gradient(90deg,#f59e0b,#d97706)",
                color: payLoading ? "var(--text-3)" : "#fff",
                border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700,
                cursor: payLoading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {payLoading ? (
                  <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #aaa", borderTopColor: "var(--green)", animation: "spin 0.7s linear infinite" }}/> Procesando...</>
                ) : `⭐ Pagar ${FEATURED_PRICE}`}
              </button>
              <button onClick={() => setStep("pricing")} style={{ flex: 1, padding: "11px", background: "none", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-3)", cursor: "pointer" }} disabled={payLoading}>
                Atrás
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>
              Modo demo — no se realizará ningún cobro real
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}
