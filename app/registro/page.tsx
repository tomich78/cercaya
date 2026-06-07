"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import LocationInput from "../components/LocationInput";
import GoogleButton from "../components/GoogleButton";
import { register, updateUser } from "../lib/auth";

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

// Ícono ojo abierto / cerrado
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

function RegistroForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  // "form" → llenado del formulario | "confirm" → revisión antes de crear
  const [step, setStep] = useState<"form" | "confirm">("form");

  const [form, setForm] = useState({ name: "", email: "", dni: "", password: "", confirm: "", location: "" });
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading]         = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [registered,   setRegistered]  = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
    setGlobalError("");
  }

  function handleLocationChange(name: string, lat: number, lng: number) {
    setForm(f => ({ ...f, location: name }));
    setLocationLat(lat);
    setLocationLng(lng);
    if (errors.location) setErrors(e => ({ ...e, location: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())     e.name     = "Obligatorio";
    if (!form.email.trim())    e.email    = "Obligatorio";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email inválido";
    if (!form.dni.trim())      e.dni      = "Obligatorio";
    else if (!/^\d{7,8}$/.test(form.dni.trim())) e.dni = "El DNI debe tener 7 u 8 dígitos";
    if (!form.password)        e.password = "Obligatorio";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (!form.confirm)         e.confirm  = "Obligatorio";
    else if (form.confirm !== form.password) e.confirm = "Las contraseñas no coinciden";
    if (!form.location.trim()) e.location = "Obligatorio";
    else if (!locationLat)     e.location = "Elegí una ubicación de la lista";
    if (!termsAccepted)        e.terms    = "Debés aceptar los términos para continuar";
    return e;
  }

  // Paso 1: validar y avanzar a la confirmación
  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // Verificar unicidad del DNI antes de avanzar
    setLoading(true);
    try {
      const res  = await fetch("/api/check-dni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: form.dni.trim() }),
      });
      const data = await res.json() as { available?: boolean; error?: string };
      if (!data.available) {
        setErrors(errs => ({ ...errs, dni: data.error ?? "DNI no disponible" }));
        return;
      }
    } catch {
      setGlobalError("Error de conexión. Intentá de nuevo.");
      return;
    } finally {
      setLoading(false);
    }

    setStep("confirm");
  }

  // Paso 2: crear la cuenta de verdad
  async function handleConfirm() {
    setLoading(true);
    setGlobalError("");

    const result = await register(form.name, form.email, form.password, form.location);
    if (result.error) {
      setGlobalError(result.error);
      setStep("form");   // volver al formulario para que pueda corregir
      setLoading(false);
      return;
    }

    if (result.user) {
      await updateUser(result.user.id, {
        dniNumber: form.dni.trim(),
        ...(locationLat && locationLng
          ? { location: form.location, lat: locationLat, lng: locationLng }
          : {}),
      });
    }

    if (result.user) {
      router.push(redirect);
      return;
    }

    setRegisteredEmail(form.email);
    setRegistered(true);
    setLoading(false);
  }

  // ── Pantalla post-registro: confirmar email ─────────────────
  if (registered) {
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
              Te enviamos un link de confirmación a
            </p>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--green)",
              background: "var(--green-subtle)", padding: "6px 14px",
              borderRadius: 6, display: "inline-block", marginBottom: 16,
            }}>
              {registeredEmail}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
              Hacé clic en el link del email para activar tu cuenta.<br />
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
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 2: pantalla de confirmación ───────────────────────
  if (step === "confirm") {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "2rem",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 6 }}>Paso 2 de 2</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.4 }}>
                Confirmá tus datos
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
                Revisá que todo esté correcto antes de crear tu cuenta.
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

            {/* Resumen de datos */}
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8,
              overflow: "hidden", marginBottom: 20,
            }}>
              {[
                { label: "Nombre", value: form.name, icon: "👤" },
                { label: "Email",  value: form.email, icon: "✉️" },
                { label: "DNI",    value: form.dni.trim().slice(0, 2) + "•".repeat(Math.max(0, form.dni.trim().length - 4)) + form.dni.trim().slice(-2), icon: "🪪" },
                { label: "Zona",   value: form.location, icon: "📍" },
                { label: "Contraseña", value: "••••••••", icon: "🔒" },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    background: "var(--bg)",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{row.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 1 }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  background: "var(--green)", color: "#fff",
                  border: "none", borderRadius: 6,
                  padding: "11px", fontSize: 14, fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: -0.1,
                }}
              >
                {loading ? "Creando cuenta..." : "✓ Confirmar y crear cuenta"}
              </button>
              <button
                onClick={() => { setStep("form"); setGlobalError(""); }}
                disabled={loading}
                style={{
                  background: "none", color: "var(--text-2)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "9px", fontSize: 13, fontWeight: 400,
                  cursor: loading ? "default" : "pointer",
                }}
              >
                ← Volver y editar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 1: formulario ──────────────────────────────────────
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
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 6 }}>Paso 1 de 2</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.4 }}>
              Crear cuenta
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Empezá a comprar y vender cerca tuyo.
            </p>
          </div>

          {globalError && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 6, padding: "9px 12px",
              fontSize: 13, color: "var(--red)", marginBottom: 16,
            }}>
              {globalError}
            </div>
          )}

          {/* Google */}
          <GoogleButton redirect={redirect} />

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>o registrate con email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Nombre */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Nombre completo
              </label>
              <input
                value={form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="Ej: Marcos Ruiz"
                autoComplete="name"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.name}</div>}
            </div>

            {/* Email */}
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
              {errors.email && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.email}</div>}
            </div>

            {/* DNI */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                DNI
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.dni}
                onChange={e => setField("dni", e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Ej: 38521467"
                autoComplete="off"
                style={inputStyle(!!errors.dni)}
              />
              {errors.dni
                ? <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.dni}</div>
                : <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
                    Se usa para evitar cuentas duplicadas. Solo vos podés verlo.
                  </div>
              }
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  title={showPassword ? "Ocultar" : "Mostrar"}
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

            {/* Repetir contraseña */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Repetir contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={e => setField("confirm", e.target.value)}
                  placeholder="Repetí tu contraseña"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirm), paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  title={showConfirm ? "Ocultar" : "Mostrar"}
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

            {/* Ubicación */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Tu zona
              </label>
              <LocationInput
                value={form.location}
                onChange={handleLocationChange}
                onClear={() => { setForm(f => ({ ...f, location: "" })); setLocationLat(null); setLocationLng(null); }}
                hasError={!!errors.location}
              />
              {errors.location && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.location}</div>}
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
                Se usa para mostrarte productos cercanos.
              </div>
            </div>

            {/* Términos y condiciones */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => { setTermsAccepted(e.target.checked); if (errors.terms) setErrors(er => ({ ...er, terms: "" })); }}
                  style={{ marginTop: 2, accentColor: "var(--green)", width: 15, height: 15, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" style={{ color: "var(--green)", fontWeight: 500 }}>
                    Términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" target="_blank" style={{ color: "var(--green)", fontWeight: 500 }}>
                    Política de privacidad
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{errors.terms}</div>
              )}
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
              {loading ? "Verificando..." : "Siguiente →"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>¿Ya tenés cuenta? </span>
            <Link href={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`} style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>
              Iniciar sesión
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <RegistroForm />
    </Suspense>
  );
}
