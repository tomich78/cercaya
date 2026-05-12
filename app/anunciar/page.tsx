"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast } from "../components/ToastProvider";
import { STATS, PLANS, HOW_IT_WORKS, labelStyle, inputStyle } from "./data";

export default function PublicidadPage() {
  usePageTitle("Publicidad");
  const { toast } = useToast();
  const [form,    setForm]    = useState({ name: "", email: "", company: "", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast("Completá nombre y email", "error"); return;
    }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    toast("¡Mensaje enviado! Te contactamos en menos de 24 h 🎯");
    setForm({ name: "", email: "", company: "", message: "" });
  }

  return (
    <div>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)",
        padding: "4rem 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(26,171,130,0.15)",
            border: "1px solid rgba(26,171,130,0.3)",
            borderRadius: 999, padding: "4px 14px",
            fontSize: 11, fontWeight: 600, letterSpacing: 1,
            color: "#1aab82", textTransform: "uppercase",
            marginBottom: 16,
          }}>
            🎯 Publicidad en EstamosCerca
          </div>
          <h1 style={{
            fontSize: 34, fontWeight: 800, color: "#fff",
            letterSpacing: -1, lineHeight: 1.15, margin: "0 0 14px",
          }}>
            Llegá a compradores reales<br />de tu zona
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", margin: "0 0 28px", lineHeight: 1.7 }}>
            Más de 5.000 usuarios activos buscando productos cerca suyo todos los días.
            Tu negocio puede estar justo donde ellos están mirando.
          </p>
          <a href="#planes" style={{
            background: "#1aab82", color: "#fff",
            borderRadius: 6, padding: "10px 24px",
            fontSize: 13, fontWeight: 600, display: "inline-block",
            textDecoration: "none",
          }}>
            Ver planes →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12, marginBottom: 56,
        }} className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "1.25rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Planes ───────────────────────────────────────────────── */}
        <div id="planes" style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>
              Opciones de visibilidad
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 8px" }}>
              Planes para cada necesidad
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>
              Desde vendedores individuales hasta marcas que quieren llegar a miles de personas.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="plans-grid">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                style={{
                  background: "var(--surface)",
                  border: plan.badge === "Más popular" ? "2px solid var(--green)" : "1px solid var(--border)",
                  boxShadow: plan.badge === "Más popular" ? "0 0 0 4px var(--green-subtle)" : "none",
                  borderRadius: 10, overflow: "hidden",
                  display: "flex", flexDirection: "column",
                }}
              >
                {plan.badge && (
                  <div style={{
                    background: plan.id === "negocio" ? "var(--green)" : "#7c3aed",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    letterSpacing: 0.5, textTransform: "uppercase",
                    textAlign: "center", padding: "5px 0",
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: plan.bgColor,
                    borderRadius: 6, padding: "5px 10px",
                    marginBottom: 14, alignSelf: "flex-start",
                  }}>
                    <span style={{ fontSize: 16 }}>{plan.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: plan.color }}>{plan.name}</span>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2, color: "var(--text)" }}>
                    {plan.price}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>{plan.period}</div>

                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 16px" }}>
                    {plan.desc}
                  </p>

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 7 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: "var(--text-2)" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="7" cy="7" r="7" fill={plan.id === "negocio" ? "var(--green)" : plan.id === "banner" ? "#7c3aed" : "#d97706"} opacity="0.15"/>
                          <polyline points="4,7 6,9 10,5" stroke={plan.id === "negocio" ? "var(--green)" : plan.id === "banner" ? "#7c3aed" : "#d97706"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: "auto" }}>
                    {plan.ctaLink ? (
                      <Link href={plan.ctaLink} style={{
                        display: "block", textAlign: "center",
                        padding: "9px", borderRadius: 6,
                        background: plan.id === "negocio" ? "var(--green)" : "var(--bg)",
                        color: plan.id === "negocio" ? "#fff" : "var(--text-2)",
                        border: plan.id === "negocio" ? "none" : "1px solid var(--border)",
                        fontSize: 13, fontWeight: 600,
                        textDecoration: "none",
                      }}>
                        {plan.cta}
                      </Link>
                    ) : (
                      <a href="#contacto" style={{
                        display: "block", textAlign: "center",
                        padding: "9px", borderRadius: 6,
                        background: "var(--bg)",
                        color: "var(--text-2)",
                        border: "1px solid var(--border)",
                        fontSize: 13, fontWeight: 600,
                        textDecoration: "none",
                      }}>
                        {plan.cta}
                      </a>
                    )}
                    <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 7 }}>
                      {plan.ctaNote}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cómo funciona ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>
              Proceso
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
              Cómo funciona
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="howto-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "1.5rem",
              }}>
                <div style={{
                  fontSize: 32, fontWeight: 900, color: "var(--border)",
                  letterSpacing: -1, lineHeight: 1, marginBottom: 12,
                }}>
                  {step.step}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Formulario de contacto ────────────────────────────────── */}
        <div id="contacto" style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "2rem",
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "var(--green)", textTransform: "uppercase", marginBottom: 8 }}>
              Contacto comercial
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, margin: "0 0 8px" }}>
              ¿Querés anunciar en EstamosCerca?
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
              Contanos sobre tu negocio y te armamos una propuesta personalizada.
              También podés escribirnos a{" "}
              <a href="mailto:publicidad@EstamosCerca.com.ar" style={{ color: "var(--green)", fontWeight: 500 }}>
                publicidad@EstamosCerca.com.ar
              </a>
            </p>
          </div>

          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="contact-grid">
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tu nombre" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contacto@tuempresa.com" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Empresa / negocio</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nombre de tu empresa o negocio" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>¿Qué te interesa?</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Contanos qué producto o servicio querés promocionar, en qué zonas, con qué presupuesto..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              style={{
                alignSelf: "flex-start",
                background: "var(--green)", color: "#fff",
                border: "none", borderRadius: 6,
                padding: "9px 22px", fontSize: 13, fontWeight: 600,
                cursor: sending ? "default" : "pointer",
                opacity: sending ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {sending ? "Enviando..." : "Enviar consulta"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
