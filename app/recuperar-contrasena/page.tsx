"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { resetPasswordForEmail } from "../lib/auth";

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 11px",
    border: `1px solid ${hasError ? "#dc2626" : "var(--border)"}`,
    borderRadius: 6,
    fontSize: 14,
    color: "var(--text)",
    background: "var(--bg)",
    outline: "none",
    fontFamily: "inherit",
  };
}

export default function RecuperarContrasenaPage() {
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Ingresá tu email"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Email inválido"); return; }

    setLoading(true);
    setError("");
    const result = await resetPasswordForEmail(email);
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    setSent(true);
  }

  // ── Pantalla de éxito ──────────────────────────────────────────
  if (sent) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "2rem", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.4 }}>
              ¡Revisá tu email!
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 6px", lineHeight: 1.6 }}>
              Te enviamos un link para restablecer tu contraseña a
            </p>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--green)",
              background: "var(--green-subtle)", padding: "6px 14px",
              borderRadius: 6, display: "inline-block", marginBottom: 16,
            }}>
              {email}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
              El link expira en 1 hora.<br />
              Si no lo ves, revisá la carpeta de spam.
            </p>
            <Link
              href="/login"
              style={{
                display: "block", background: "var(--green)", color: "#fff",
                padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "2rem",
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.4 }}>
              Recuperar contraseña
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Ingresá tu email y te mandamos un link para crear una nueva.
            </p>
          </div>

          {error && (
            <div style={{
              background: "var(--red-subtle)", border: "1px solid var(--red-border)",
              borderRadius: 6, padding: "9px 12px",
              fontSize: 13, color: "var(--red)", marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
                style={inputStyle(!!error)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "var(--green)", color: "#fff",
                border: "none", borderRadius: 6,
                padding: "11px", fontSize: 14, fontWeight: 500,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <Link href="/login" style={{ fontSize: 13, color: "var(--text-3)" }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
