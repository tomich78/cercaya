"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { login } from "../lib/auth";

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

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  const [form, setForm]               = useState({ email: "", password: "" });
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading]         = useState(false);

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
    setGlobalError("");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email.trim())    e.email    = "Obligatorio";
    if (!form.password)        e.password = "Obligatorio";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    const result = await login(form.email, form.password);
    if (result.error) {
      setGlobalError(result.error);
      setLoading(false);
      return;
    }
    router.push(redirect);
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "2rem",
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.4 }}>
              Iniciar sesión
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Bienvenido de vuelta a EstamosCerca.
            </p>
          </div>

          {globalError && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 6, padding: "9px 12px",
              fontSize: 13, color: "#dc2626", marginBottom: 16,
            }}>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setField("email", e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                style={inputStyle(!!errors.email)}
              />
              {errors.email && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.email}</div>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setField("password", e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                style={inputStyle(!!errors.password)}
              />
              {errors.password && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.password}</div>}
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
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>¿No tenés cuenta? </span>
            <Link href={`/registro${redirect !== "/" ? `?redirect=${redirect}` : ""}`} style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>
              Registrarse
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <LoginForm />
    </Suspense>
  );
}
