"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import LocationInput from "../components/LocationInput";
import { getCurrentUser, updateUser } from "../lib/auth";

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

function CompletarPerfilForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  const [userId,      setUserId]      = useState("");
  const [userName,    setUserName]    = useState("");
  const [dni,         setDni]         = useState("");
  const [location,    setLocation]    = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [ready,       setReady]       = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) { router.replace("/login"); return; }
      // Si ya completó el perfil, saltar directo
      if (user.dniNumber && user.location) { router.replace(redirect); return; }
      setUserId(user.id);
      setUserName(user.name);
      setReady(true);
    })();
  }, [router, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!dni.trim())                          errs.dni      = "Obligatorio";
    else if (!/^\d{7,8}$/.test(dni.trim()))   errs.dni      = "El DNI debe tener 7 u 8 dígitos";
    if (!location.trim())                     errs.location = "Obligatorio";
    else if (!locationLat)                    errs.location = "Elegí una ubicación de la lista";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);

    // Verificar unicidad del DNI
    try {
      const res  = await fetch("/api/check-dni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni.trim() }),
      });
      const data = await res.json() as { available?: boolean; error?: string };
      if (!data.available) {
        setErrors(er => ({ ...er, dni: data.error ?? "DNI no disponible" }));
        setLoading(false);
        return;
      }
    } catch {
      setGlobalError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    await updateUser(userId, {
      dniNumber: dni.trim(),
      location,
      ...(locationLat && locationLng ? { lat: locationLat, lng: locationLng } : {}),
    });

    router.replace(redirect);
  }

  if (!ready) return <div><Navbar /></div>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1.5rem" }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "2rem",
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.4 }}>
              ¡Hola{userName ? `, ${userName.split(" ")[0]}` : ""}!
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
              Solo necesitamos dos datos más para activar tu cuenta.
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* DNI */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                DNI
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={e => {
                  setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                  if (errors.dni) setErrors(er => ({ ...er, dni: "" }));
                  setGlobalError("");
                }}
                placeholder="Ej: 38521467"
                autoComplete="off"
                style={inputStyle(!!errors.dni)}
              />
              {errors.dni
                ? <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.dni}</div>
                : <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>Para evitar cuentas duplicadas. Solo vos podés verlo.</div>
              }
            </div>

            {/* Zona */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
                Tu zona
              </label>
              <LocationInput
                value={location}
                onChange={(name, lat, lng) => {
                  setLocation(name);
                  setLocationLat(lat);
                  setLocationLng(lng);
                  if (errors.location) setErrors(er => ({ ...er, location: "" }));
                }}
                onClear={() => { setLocation(""); setLocationLat(null); setLocationLng(null); }}
                hasError={!!errors.location}
              />
              {errors.location
                ? <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.location}</div>
                : <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>Para mostrarte productos cercanos.</div>
              }
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
              {loading ? "Guardando..." : "Activar mi cuenta →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CompletarPerfilPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <CompletarPerfilForm />
    </Suspense>
  );
}
