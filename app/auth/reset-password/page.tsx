"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { updatePassword } from "../../lib/auth";

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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

type PageState = "loading" | "ready" | "done" | "invalid";

function ResetPasswordForm() {
  const router = useRouter();

  const [pageState,    setPageState]    = useState<PageState>("loading");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [globalError,  setGlobalError]  = useState("");
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    // Supabase detecta el token RECOVERY del link automáticamente
    // y dispara el evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // Timeout: si en 5s no llega el evento, el link es inválido o ya fue usado
    const timeout = setTimeout(() => {
      setPageState(s => s === "loading" ? "invalid" : s);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!password)              errs.password = "Obligatorio";
    else if (password.length < 6) errs.password = "Mínimo 6 caracteres";
    if (!confirm)               errs.confirm  = "Obligatorio";
    else if (confirm !== password) errs.confirm = "Las contraseñas no coinciden";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setGlobalError("");

    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) { setGlobalError(result.error); return; }
    setPageState("done");

    // Redirigir al login luego de 2 segundos
    setTimeout(() => router.replace("/login"), 2000);
  }

  // ── Loading ────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 420, margin: "5rem auto", padding: "0 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>Verificando el link...</p>
        </div>
      </div>
    );
  }

  // ── Link inválido o expirado ───────────────────────────────────
  if (pageState === "invalid") {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "2rem", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.4 }}>
              Link inválido o expirado
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
              Este link ya fue usado o venció. Pedí uno nuevo desde la pantalla de recuperación.
            </p>
            <Link
              href="/recuperar-contrasena"
              style={{
                display: "block", background: "var(--green)", color: "#fff",
                padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Pedir nuevo link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Contraseña actualizada ─────────────────────────────────────
  if (pageState === "done") {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "2rem", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.4 }}>
              ¡Contraseña actualizada!
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Redirigiendo al inicio de sesión...
            </p>
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
              Nueva contraseña
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Elegí una contraseña segura para tu cuenta.
            </p>
          </div>

          {globalError && (
            <div style={{
              background: "var(--red-subtle)", border: "1px solid var(--red-border)",
              borderRadius: 6, padding: "9px 12px",
              fontSize: 13, color: "var(--red)", marginBottom: 16,
            }}>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Nueva contraseña */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Nueva contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: "" })); }}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  autoFocus
                  style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", padding: 2, display: "flex", alignItems: "center",
                  }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.password}</div>}
            </div>

            {/* Confirmar */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Repetir contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setErrors(er => ({ ...er, confirm: "" })); }}
                  placeholder="Repetí tu contraseña"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirm), paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", padding: 2, display: "flex", alignItems: "center",
                  }}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {errors.confirm && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.confirm}</div>}
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
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
