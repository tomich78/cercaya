"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import LocationInput from "../components/LocationInput";
import { getCurrentUser, updateUser, uploadAvatar, uploadDniDoc, validateCuit, formatCuit, type LocalUser } from "../lib/auth";
import { getLocalProducts, deleteLocalProduct, updateProduct, getBusinessStats, type LocalProduct, type BusinessStats } from "../lib/storage";
import { getReviewsForSeller, type Review } from "../lib/reviews";
import { useToast } from "../components/ToastProvider";
import { usePageTitle } from "../lib/usePageTitle";

// ─── Phone verification ───────────────────────────────────────────────────────

type PhoneStep = "idle" | "number" | "code";

function PhoneVerification({ user, onVerified }: { user: LocalUser; onVerified: () => void }) {
  const [step, setStep]     = useState<PhoneStep>("idle");
  const [phone, setPhone]   = useState("");
  const [input, setInput]   = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError]   = useState("");

  if (user.phoneVerified) return <VerifRow label="Teléfono" sub={user.phoneNumber ?? "Verificado"} verified />;

  if (step === "idle") return (
    <VerifRow label="Teléfono" sub="Sin verificar" verified={false}
      action={<button onClick={() => setStep("number")} style={actionBtn}>Verificar</button>} />
  );

  if (step === "number") return (
    <div style={expandBox}>
      <div style={expandTitle}>Verificá tu teléfono</div>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 385 4123456" style={fieldInput} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => { if (!phone.trim()) return; setSecret(String(Math.floor(1000 + Math.random() * 9000))); setStep("code"); }} style={primaryBtn}>
          Enviar código
        </button>
        <button onClick={() => setStep("idle")} style={ghostBtn}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div style={expandBox}>
      <div style={expandTitle}>Ingresá el código</div>
      <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#92400e", marginBottom: 10 }}>
        Modo desarrollo — tu código es: <strong style={{ letterSpacing: 2 }}>{secret}</strong>
      </div>
      <input value={input} onChange={e => { setInput(e.target.value); setError(""); }} placeholder="Código de 4 dígitos"
        maxLength={4} inputMode="numeric" style={{ ...fieldInput, borderColor: error ? "#dc2626" : "var(--border)" }} />
      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={async () => { if (input !== secret) { setError("Código incorrecto."); return; } await updateUser(user.id, { phoneVerified: true, phoneNumber: phone }); onVerified(); }} style={primaryBtn}>
          Confirmar
        </button>
        <button onClick={() => { setStep("number"); setInput(""); setError(""); }} style={ghostBtn}>Reenviar</button>
      </div>
    </div>
  );
}

// ─── DNI verification ─────────────────────────────────────────────────────────

type DniStep = "idle" | "form" | "uploading";

function DniVerification({ user, onSubmitted }: { user: LocalUser; onSubmitted: () => void }) {
  const [step, setStep]     = useState<DniStep>("idle");
  const [dni, setDni]       = useState("");
  const [file, setFile]     = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError]   = useState("");

  // ── Estado: aprobado ──
  if (user.dniStatus === "approved") {
    return (
      <VerifRow
        label="DNI"
        sub={`Nº ${user.dniNumber ?? "—"} · Verificado`}
        verified
      />
    );
  }

  // ── Estado: en revisión ──
  if (user.dniStatus === "pending") {
    return (
      <div style={{ padding: "14px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>DNI en revisión</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
              Nº {user.dniNumber ?? "—"} · Revisamos tu documento en 24–48 h
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 6, fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
          Recibimos tu DNI y lo estamos verificando. Te avisaremos cuando esté aprobado. Mientras tanto podés usar la app normalmente.
        </div>
      </div>
    );
  }

  // ── Estado: rechazado ──
  if (user.dniStatus === "rejected") {
    return (
      <div style={{ padding: "14px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
            ✕
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>Verificación rechazada</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
              La foto no era legible. Podés intentarlo de nuevo.
            </div>
          </div>
        </div>
        <button onClick={() => setStep("form")} style={actionBtn}>Volver a intentar</button>
      </div>
    );
  }

  // ── Estado: idle (sin verificar) ──
  if (step === "idle") {
    return (
      <VerifRow
        label="DNI"
        sub="Sin verificar — aumenta la confianza de los compradores"
        verified={false}
        action={<button onClick={() => setStep("form")} style={actionBtn}>Verificar</button>}
      />
    );
  }

  // ── Estado: uploading ──
  if (step === "uploading") {
    return (
      <div style={expandBox}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-2)" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--green)", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          Subiendo documento...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Estado: form ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function handleSubmit() {
    if (!dni.trim()) { setError("Ingresá tu número de DNI."); return; }
    if (dni.length < 7) { setError("El número de DNI debe tener al menos 7 dígitos."); return; }
    if (!file) { setError("Adjuntá una foto del frente de tu DNI."); return; }

    setStep("uploading");
    try {
      const docPath = await uploadDniDoc(user.id, file);
      await updateUser(user.id, {
        dniNumber: dni,
        dniStatus: "pending",
        dniDocUrl: docPath,
      });
      onSubmitted();
    } catch {
      setError("Error al subir el documento. Verificá tu conexión e intentá de nuevo.");
      setStep("form");
    }
  }

  return (
    <div style={expandBox}>
      <div style={expandTitle}>Verificá tu DNI</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14, lineHeight: 1.6 }}>
        Ingresá tu número de DNI y una foto nítida del frente del documento. El proceso tarda 24–48 horas hábiles.
      </div>

      {/* Número de DNI */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
          Número de DNI
        </label>
        <input
          value={dni}
          onChange={e => { setDni(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="Ej: 38540123"
          inputMode="numeric"
          maxLength={9}
          style={{ ...fieldInput, borderColor: error && !dni ? "#dc2626" : "var(--border)" }}
        />
      </div>

      {/* Upload foto */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
          Foto del frente del DNI
        </label>

        {preview ? (
          /* Preview de la foto seleccionada */
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="DNI preview"
              style={{ height: 90, borderRadius: 6, border: "1px solid var(--border)", display: "block", objectFit: "cover", maxWidth: "100%" }}
            />
            <label
              style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}
            >
              Cambiar
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <label style={{
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6,
            padding: "18px", border: "1.5px dashed var(--border)", borderRadius: 6,
            fontSize: 12, color: "var(--text-3)", cursor: "pointer", background: "var(--bg)",
            transition: "border-color 0.12s",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Tocá para adjuntar foto</span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>JPG, PNG o HEIC — máx. 10 MB</span>
            <input type="file" accept="image/*,image/heic" style={{ display: "none" }} onChange={handleFileChange} />
          </label>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, padding: "8px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSubmit}
          style={{ ...primaryBtn, flex: 2 }}
        >
          Enviar para revisión
        </button>
        <button onClick={() => { setStep("idle"); setDni(""); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); setError(""); }} style={{ ...ghostBtn, flex: 1 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function VerifRow({ label, sub, verified, action }: { label: string; sub: string; verified: boolean; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: verified ? "var(--green)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: verified ? "#fff" : "var(--text-3)", fontWeight: 700, flexShrink: 0 }}>
          {verified ? "✓" : "—"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: verified ? "var(--text)" : "var(--text-2)" }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const expandBox:  React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px", margin: "4px 0 8px" };
const expandTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" };
const fieldInput:  React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit" };
const primaryBtn:  React.CSSProperties = { background: "var(--green)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" };
const ghostBtn:    React.CSSProperties = { background: "none", color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer" };
const actionBtn:   React.CSSProperties = { background: "none", color: "var(--green)", border: "1px solid var(--green)", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer" };

// ─── Profile completeness indicator ─────────────────────────────────────────

const COMPLETION_STEPS = [
  {
    key:   "avatar",
    label: "Foto de perfil",
    hint:  "Subí una foto para que los compradores te reconozcan",
    done:  (u: LocalUser) => !!u.avatarUrl,
  },
  {
    key:   "location",
    label: "Zona configurada",
    hint:  "Agregá tu barrio o ciudad con el botón «Editar perfil»",
    done:  (u: LocalUser) => !!u.location,
  },
  {
    key:   "phone",
    label: "Teléfono verificado",
    hint:  "Verificá tu número en la sección de identidad",
    done:  (u: LocalUser) => u.phoneVerified,
  },
  {
    key:   "dni",
    label: "DNI verificado",
    hint:  "Enviá una foto de tu DNI para generar más confianza",
    done:  (u: LocalUser) => u.dniVerified,
  },
  {
    key:   "product",
    label: "Primera publicación",
    hint:  "Publicá tu primer artículo y empezá a vender",
    done:  (_u: LocalUser, products: LocalProduct[]) => products.length > 0,
  },
] as const;

function ProfileCompletion({ user, products }: { user: LocalUser; products: LocalProduct[] }) {
  const steps = COMPLETION_STEPS.map(s => ({
    ...s,
    isDone: s.done(user, products),
  }));
  const completed = steps.filter(s => s.isDone).length;
  const total     = steps.length;
  const pct       = Math.round((completed / total) * 100);

  if (pct === 100) return null; // ocultar cuando el perfil está completo

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "1.25rem", marginBottom: 16,
    }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2 }}>
          Completá tu perfil
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
          {completed} de {total}
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{
        height: 6, borderRadius: 999,
        background: "var(--border)",
        marginBottom: 14, overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 999,
          background: pct >= 80 ? "var(--green)" : pct >= 40 ? "#d97706" : "#ef4444",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Lista de pasos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map(step => (
          <div key={step.key} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            opacity: step.isDone ? 0.55 : 1,
          }}>
            {/* Icono */}
            <div style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              background:    step.isDone ? "var(--green)" : "transparent",
              border:        step.isDone ? "none" : "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {step.isDone && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3"/>
                </svg>
              )}
            </div>
            {/* Texto */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: step.isDone ? 400 : 500, color: step.isDone ? "var(--text-3)" : "var(--text)", textDecoration: step.isDone ? "line-through" : "none" }}>
                {step.label}
              </div>
              {!step.isDone && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                  {step.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trustLabel(user: LocalUser) {
  if (user.phoneVerified && user.dniVerified)      return { text: "Verificado completo",   color: "var(--green)", bg: "var(--green-subtle)" };
  if (user.phoneVerified && user.dniStatus === "pending") return { text: "DNI en revisión", color: "#d97706",      bg: "#fef3c7" };
  if (user.phoneVerified)                          return { text: "Verificación parcial",   color: "#d97706",      bg: "#fef3c7" };
  if (user.dniStatus === "pending")                return { text: "DNI en revisión",         color: "#d97706",      bg: "#fef3c7" };
  return { text: "Sin verificar", color: "var(--text-3)", bg: "var(--bg)" };
}

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  usePageTitle("Mi perfil");
  const router = useRouter();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser]             = useState<LocalUser | null>(null);
  const [myProducts, setMyProducts] = useState<LocalProduct[]>([]);
  const [myReviews, setMyReviews]   = useState<Review[]>([]);
  const [ready, setReady]           = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Estado del formulario de edición
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState("");
  const [editLoc,  setEditLoc]      = useState("");
  const [editLat,  setEditLat]      = useState<number | null>(null);
  const [editLng,  setEditLng]      = useState<number | null>(null);
  const [editErr,  setEditErr]      = useState("");
  const [saving,   setSaving]       = useState(false);

  async function reload() {
    const u = await getCurrentUser();
    if (!u) return;
    setUser({ ...u });
    setMyProducts((await getLocalProducts({ includeSold: true })).filter(p => p.userId === u.id));
    setMyReviews(await getReviewsForSeller(u.id));
  }

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login?redirect=/perfil"); return; }
      setUser(u);
      setMyProducts((await getLocalProducts({ includeSold: true })).filter(p => p.userId === u.id));
      setMyReviews(await getReviewsForSeller(u.id));
      setReady(true);
    })();
  }, [router]);

  // ── Avatar upload ──────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateUser(user.id, { avatarUrl: url });
      await reload();
      toast("Foto de perfil actualizada ✓");
    } catch {
      toast("Error al subir la foto", "error");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  // ── Editar perfil ──────────────────────────────────────────
  function startEdit() {
    if (!user) return;
    setEditName(user.name);
    setEditLoc(user.location);
    setEditLat(user.lat ?? null);
    setEditLng(user.lng ?? null);
    setEditErr("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) { setEditErr("El nombre no puede estar vacío."); return; }
    if (!editLoc.trim())  { setEditErr("Elegí una ubicación de la lista."); return; }
    if (!editLat)         { setEditErr("Elegí una ubicación válida de la lista."); return; }
    setSaving(true);
    await updateUser(user!.id, {
      name: editName.trim(),
      location: editLoc,
      lat: editLat,
      lng: editLng ?? undefined,
    });
    await reload();
    setEditing(false);
    setSaving(false);
    toast("Perfil actualizado ✓");
  }

  if (!ready || !user) return <div><Navbar /></div>;

  const trust = trustLabel(user);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Encabezado de perfil ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.5rem", marginBottom: 16 }}>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>

            {/* Avatar clickeable */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{ width: 64, height: 64, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", position: "relative", overflow: "hidden", background: "var(--green-subtle)" }}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{user.initials}</span>
                )}
                {/* Overlay cámara */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: uploadingAvatar ? 1 : 0,
                  transition: "opacity 0.15s",
                }}
                  onMouseEnter={e => { if (!uploadingAvatar) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                  onMouseLeave={e => { if (!uploadingAvatar) (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
                >
                  {uploadingAvatar ? (
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* Nombre + ubicación */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Nombre</label>
                    <input
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditErr(""); }}
                      style={{ ...fieldInput, fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Zona</label>
                    <LocationInput
                      value={editLoc}
                      onChange={(name, lat, lng) => { setEditLoc(name); setEditLat(lat); setEditLng(lng); setEditErr(""); }}
                      onClear={() => { setEditLoc(""); setEditLat(null); setEditLng(null); }}
                    />
                  </div>
                  {editErr && <div style={{ fontSize: 12, color: "#dc2626" }}>{editErr}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, fontSize: 12 }}>
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => setEditing(false)} style={{ ...ghostBtn, fontSize: 12 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4, marginBottom: 3 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
                    {user.location || "Sin zona configurada"} · Miembro desde {memberSince(user.createdAt)}
                  </div>
                  <button onClick={startEdit} style={actionBtn}>Editar perfil</button>
                </>
              )}
            </div>
          </div>

          {/* Badge de confianza */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: trust.bg, color: trust.color }}>
            {user.phoneVerified && user.dniVerified ? "✓ " : ""}{trust.text}
          </div>
        </div>

        {/* ── Indicador de perfil completo ── */}
        <ProfileCompletion user={user} products={myProducts} />

        {/* ── Verificaciones ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>
            Verificaciones de identidad
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
            Los vendedores verificados generan más confianza y reciben más consultas.
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <PhoneVerification user={user} onVerified={() => { reload(); toast("Teléfono verificado ✓"); }} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <DniVerification user={user} onSubmitted={() => { reload(); toast("DNI enviado — lo revisamos en 24–48 h", "info"); }} />
          </div>
        </div>

        {/* ── Reseñas recibidas ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: -0.2 }}>
            Reseñas recibidas
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>({myReviews.length})</span>
          </div>
          {myReviews.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>
              Todavía no recibiste reseñas. Aparecen acá cuando alguien califica una transacción.
            </div>
          ) : (
            myReviews.map((r, i) => (
              <div key={r.id} style={{ paddingBottom: i < myReviews.length - 1 ? 14 : 0, marginBottom: i < myReviews.length - 1 ? 14 : 0, borderBottom: i < myReviews.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "var(--text-2)" }}>
                      {r.reviewerInitials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.reviewerName}</span>
                  </div>
                  <div style={{ color: "#d97706", fontSize: 13, letterSpacing: 1 }}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{r.text}</div>
              </div>
            ))
          )}
        </div>

        {/* ── Perfil de negocio ── */}
        <BusinessSection user={user} onSaved={() => { reload(); toast("Perfil de negocio actualizado ✓"); }} />

        {/* ── Mis publicaciones ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
              Mis publicaciones ({myProducts.length})
            </div>
            <Link href="/publicar" style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>+ Nueva</Link>
          </div>

          {myProducts.length === 0 ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "2.5rem", textAlign: "center", color: "var(--text-3)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No publicaste nada todavía</div>
              <Link href="/publicar" style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>Publicar algo →</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {myProducts.map(p => (
                <ProductMini
                  key={p.id}
                  product={p}
                  onDelete={async () => {
                    await deleteLocalProduct(p.id);
                    setMyProducts(prev => prev.filter(x => x.id !== p.id));
                    toast("Publicación eliminada", "info");
                  }}
                  onToggleSold={async () => {
                    const newSold = !p.sold;
                    await updateProduct(p.id, { sold: newSold });
                    setMyProducts(prev => prev.map(x => x.id === p.id ? { ...x, sold: newSold } : x));
                    toast(newSold ? "Marcado como vendido" : "Vuelto a activar", "info");
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── BusinessStats ───────────────────────────────────────────────────────────

function BusinessStats({ userId }: { userId: string }) {
  const [stats,   setStats]   = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open || stats) return;
    getBusinessStats(userId).then(s => { setStats(s); setLoading(false); });
  }, [open, userId, stats]);

  const METRICS = stats ? [
    { icon: "👁️", label: "Vistas en productos",  value: stats.totalViews.toLocaleString("es-AR"),    color: "var(--green)" },
    { icon: "🏪", label: "Visitas a tu página",   value: stats.pageViews.toLocaleString("es-AR"),     color: "#7c3aed" },
    { icon: "💬", label: "Consultas recibidas",   value: stats.totalMessages.toLocaleString("es-AR"), color: "#1d4ed8" },
    { icon: "📦", label: "Productos vendidos",    value: stats.totalSold.toLocaleString("es-AR"),      color: "#d97706" },
  ] : [];

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          <span>📊</span> Estadísticas
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Grid de métricas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {METRICS.map(m => (
                  <div key={m.label} style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: m.color, letterSpacing: -0.5, lineHeight: 1 }}>
                      {m.value}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Publicaciones activas */}
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: stats.topProduct ? 8 : 0,
              }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>Publicaciones activas</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{stats.activeListings}</span>
              </div>

              {/* Producto más visto */}
              {stats.topProduct && stats.topProduct.views > 0 && (
                <div style={{
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "10px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>🥇 Producto más visto</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                      {stats.topProduct.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>
                    {stats.topProduct.views} vistas
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 10 }}>
                Las estadísticas se actualizan en tiempo real
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── BusinessSection ─────────────────────────────────────────────────────────

const BUSINESS_CATEGORIES = [
  "Electrónica", "Ropa y accesorios", "Hogar y deco", "Deportes",
  "Vehículos", "Alimentos", "Servicios", "Arte y coleccionables", "Otro",
];

// Precio mensual en ARS (mock — fácil de cambiar)
const PLAN_PRICE = "$4.999";
const PLAN_PRICE_LABEL = "/ mes";

type BizStep = "closed" | "pricing" | "paying" | "form";

function BusinessSection({ user, onSaved }: { user: LocalUser; onSaved: () => void }) {
  // Ya pagó → empieza directo en form si está abierto
  const [step, setStep] = useState<BizStep>("closed");
  const [saving, setSaving]   = useState(false);
  const [cuitErr, setCuitErr] = useState("");

  // Campos del formulario
  const [bName,  setBName]  = useState(user.businessName     ?? "");
  const [bSlug,  setBSlug]  = useState(user.businessSlug     ?? "");
  const [bCat,   setBCat]   = useState(user.businessCategory ?? "");
  const [bHours, setBHours] = useState(user.businessHours    ?? "");
  const [bDesc,  setBDesc]  = useState(user.businessDesc     ?? "");
  const [bCuit,  setBCuit]  = useState(user.businessCuit     ?? "");
  const [slugErr, setSlugErr] = useState("");

  // Mock payment
  const [cardNum,  setCardNum]  = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp,  setCardExp]  = useState("");
  const [cardCvv,  setCardCvv]  = useState("");
  const [payErr,   setPayErr]   = useState("");
  const [payLoading, setPayLoading] = useState(false);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")  // quita tildes
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48);
  }

  function handleOpen() {
    if (user.businessPaid) { setStep("form"); }
    else                   { setStep("pricing"); }
  }

  // Simula el proceso de pago (reemplazar con MercadoPago/Stripe)
  async function handlePay() {
    setPayErr("");
    const digitsOnly = cardNum.replace(/\s/g, "");
    if (digitsOnly.length < 16)      { setPayErr("Número de tarjeta inválido."); return; }
    if (!cardName.trim())            { setPayErr("Ingresá el nombre del titular."); return; }
    if (cardExp.length < 5)          { setPayErr("Fecha de vencimiento inválida."); return; }
    if (cardCvv.length < 3)          { setPayErr("CVV inválido."); return; }

    setPayLoading(true);
    // Simulamos latencia de procesamiento
    await new Promise(r => setTimeout(r, 1800));
    // Marcar como pagado en Supabase
    await updateUser(user.id, { businessPaid: true, isBusiness: true });
    setPayLoading(false);
    setStep("form");
    onSaved(); // recargar user
  }

  async function handleSave() {
    // Validar slug
    const cleanSlug = bSlug.trim();
    if (!cleanSlug) { setSlugErr("El slug es obligatorio para tener página pública."); return; }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) { setSlugErr("Solo letras minúsculas, números y guiones."); return; }
    // Validar CUIT si se ingresó
    const cleanCuit = bCuit.replace(/\D/g, "");
    if (cleanCuit && !validateCuit(cleanCuit)) {
      setCuitErr("El CUIT ingresado no es válido. Verificá el número.");
      return;
    }
    setSaving(true);
    await updateUser(user.id, {
      isBusiness:           true,
      businessName:         bName.trim()  || undefined,
      businessSlug:         cleanSlug,
      businessCategory:     bCat          || undefined,
      businessHours:        bHours.trim() || undefined,
      businessDesc:         bDesc.trim()  || undefined,
      businessCuit:         cleanCuit     || undefined,
      businessCuitVerified: cleanCuit ? validateCuit(cleanCuit) : false,
    });
    setSaving(false);
    setStep("closed");
    onSaved();
  }

  // ── Badge del encabezado ──
  const badgeEl = user.businessPaid
    ? user.businessCuitVerified
      ? <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--green)", background: "var(--green-subtle)", padding: "2px 7px", borderRadius: 4, letterSpacing: 0.3, textTransform: "uppercase" as const }}>✓ Verificado</span>
      : <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 7px", borderRadius: 4, letterSpacing: 0.3, textTransform: "uppercase" as const }}>Activo</span>
    : null;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem", marginBottom: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20 }}>🏪</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center" }}>
              Perfil de negocio {badgeEl}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1, display: "flex", alignItems: "center", gap: 8 }}>
              {user.businessPaid
                ? (user.businessName ?? "Sin nombre de negocio")
                : "Vendé como empresa con ventajas exclusivas"}
              {user.businessPaid && user.businessSlug && step === "closed" && (
                <Link href={`/negocio/${user.businessSlug}`} style={{ color: "var(--green)", fontWeight: 600, fontSize: 11 }}>
                  Ver página →
                </Link>
              )}
            </div>
          </div>
        </div>
        {step === "closed"
          ? <button onClick={handleOpen} style={actionBtn}>{user.businessPaid ? "Editar" : "Activar"}</button>
          : <button onClick={() => setStep("closed")} style={actionBtn}>Cerrar</button>
        }
      </div>

      {/* ── STEP: pricing ── */}
      {step === "pricing" && (
        <div style={{ marginTop: 18 }}>
          {/* Tarjeta de precio */}
          <div style={{
            border: "2px solid var(--green)", borderRadius: 10,
            padding: "20px 20px 16px", marginBottom: 14,
            background: "var(--green-subtle)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 6 }}>
              Plan Negocio
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: -1 }}>{PLAN_PRICE}</span>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>{PLAN_PRICE_LABEL}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                ["✓", "Badge \"Negocio\" en tu perfil y productos"],
                ["✓", "Verificación de CUIT — sello de confianza"],
                ["✓", "Horario de atención visible para compradores"],
                ["✓", "Descripción y rubro de tu negocio"],
                ["✓", "Sin límite de publicaciones activas"],
                ["✓", "Estadísticas de visitas (próximamente)"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-2)", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep("paying")}
            style={{
              width: "100%", padding: "11px", background: "var(--green)", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: "pointer", letterSpacing: -0.1,
            }}
          >
            Suscribirme — {PLAN_PRICE}{PLAN_PRICE_LABEL}
          </button>
          <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>
            Podés cancelar cuando quieras · Pago seguro
          </div>
        </div>
      )}

      {/* ── STEP: paying ── */}
      {step === "paying" && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            🔒 Pago seguro
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>— modo demo</span>
          </div>

          {/* Tarjeta visual */}
          <div style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)",
            borderRadius: 12, padding: "18px 20px", marginBottom: 16,
            color: "#fff", fontSize: 13, minHeight: 90,
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
              <input
                value={cardNum}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                  setCardNum(v.replace(/(.{4})/g, "$1 ").trim());
                  setPayErr("");
                }}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                style={{ ...fieldInput, letterSpacing: 2 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Nombre en la tarjeta</label>
              <input
                value={cardName}
                onChange={e => { setCardName(e.target.value.toUpperCase()); setPayErr(""); }}
                placeholder="NOMBRE APELLIDO"
                style={{ ...fieldInput, textTransform: "uppercase" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Vencimiento</label>
                <input
                  value={cardExp}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    setCardExp(v); setPayErr("");
                  }}
                  placeholder="MM/AA"
                  inputMode="numeric"
                  style={{ ...fieldInput }}
                />
              </div>
              <div style={{ width: 90 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>CVV</label>
                <input
                  value={cardCvv}
                  onChange={e => { setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); setPayErr(""); }}
                  placeholder="123"
                  inputMode="numeric"
                  type="password"
                  style={{ ...fieldInput }}
                />
              </div>
            </div>
          </div>

          {payErr && (
            <div style={{ fontSize: 12, color: "#dc2626", marginTop: 10, padding: "7px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
              {payErr}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={handlePay}
              disabled={payLoading}
              style={{
                flex: 2, padding: "11px", background: payLoading ? "var(--border)" : "var(--green)",
                color: payLoading ? "var(--text-3)" : "#fff",
                border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: payLoading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {payLoading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--text-3)", borderTopColor: "var(--green)", animation: "spin 0.7s linear infinite" }} />
                  Procesando...
                </>
              ) : `Pagar ${PLAN_PRICE}`}
            </button>
            <button onClick={() => setStep("pricing")} style={{ ...ghostBtn, flex: 1 }} disabled={payLoading}>
              Atrás
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>
            Modo demo — no se realizará ningún cobro real
          </div>
        </div>
      )}

      {/* ── STEP: form (ya pagó) ── */}
      {step === "form" && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Estado del pago */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--green-subtle)", borderRadius: 7, border: "1px solid #c5e8dc" }}>
            <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Suscripción activa</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>{PLAN_PRICE}{PLAN_PRICE_LABEL}</span>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Nombre del negocio</label>
            <input
              value={bName}
              onChange={e => {
                setBName(e.target.value);
                // Auto-generar slug si aún no fue editado manualmente
                if (!user.businessSlug) setBSlug(generateSlug(e.target.value));
              }}
              placeholder="Ej: Electro Tomás"
              style={{ ...fieldInput }}
            />
          </div>

          {/* Slug / URL pública */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
              URL de tu página
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>— EstamosCerca.com.ar/negocio/tu-slug</span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 12, color: "var(--text-3)", pointerEvents: "none",
                }}>negocio/</span>
                <input
                  value={bSlug}
                  onChange={e => { setBSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugErr(""); }}
                  placeholder="electro-tomas"
                  style={{ ...fieldInput, paddingLeft: 72, borderColor: slugErr ? "#dc2626" : "var(--border)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setBSlug(generateSlug(bName))}
                style={{ ...ghostBtn, fontSize: 11, whiteSpace: "nowrap" as const }}
              >
                Generar
              </button>
            </div>
            {slugErr && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{slugErr}</div>}
            {bSlug && !slugErr && (
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                Tu página: <strong style={{ color: "var(--green)" }}>EstamosCerca.com.ar/negocio/{bSlug}</strong>
                {user.businessSlug === bSlug && (
                  <Link href={`/negocio/${bSlug}`} target="_blank" style={{ color: "var(--green)", marginLeft: 8, fontWeight: 600 }}>
                    Ver →
                  </Link>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Rubro</label>
            <select value={bCat} onChange={e => setBCat(e.target.value)} style={{ ...fieldInput }}>
              <option value="">Elegir rubro...</option>
              {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Horario de atención</label>
            <input value={bHours} onChange={e => setBHours(e.target.value)} placeholder="Ej: Lun–Vie 9–18 h · Sáb 9–13 h" style={{ ...fieldInput }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Descripción del negocio</label>
            <textarea value={bDesc} onChange={e => setBDesc(e.target.value)} placeholder="Contá qué vendés, cómo trabajás, dónde estás..." rows={3} style={{ ...fieldInput, resize: "vertical" as const, lineHeight: 1.6 }} />
          </div>

          {/* CUIT */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
              CUIT / CUIL
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>— opcional, otorga el sello verificado</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={bCuit}
                onChange={e => {
                  const formatted = formatCuit(e.target.value);
                  setBCuit(formatted);
                  setCuitErr("");
                }}
                placeholder="XX-XXXXXXXX-X"
                inputMode="numeric"
                maxLength={13}
                style={{
                  ...fieldInput,
                  letterSpacing: 1.5,
                  borderColor: cuitErr ? "#dc2626"
                    : bCuit.replace(/\D/g, "").length === 11 && validateCuit(bCuit.replace(/\D/g, "")) ? "var(--green)"
                    : "var(--border)",
                  paddingRight: 36,
                }}
              />
              {/* Indicador inline */}
              {bCuit.replace(/\D/g, "").length === 11 && (
                <div style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 16,
                }}>
                  {validateCuit(bCuit.replace(/\D/g, "")) ? "✅" : "❌"}
                </div>
              )}
            </div>
            {cuitErr && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{cuitErr}</div>
            )}
            {bCuit.replace(/\D/g, "").length === 11 && validateCuit(bCuit.replace(/\D/g, "")) && (
              <div style={{ fontSize: 12, color: "var(--green)", marginTop: 4, fontWeight: 500 }}>
                ✓ CUIT válido — recibirás el sello "Negocio verificado"
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, flex: 2, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setStep("closed")} style={{ ...ghostBtn, flex: 1 }} disabled={saving}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas — visibles siempre que el negocio esté activo */}
      {user.businessPaid && <BusinessStats userId={user.id} />}
    </div>
  );
}

// ─── ProductMini ──────────────────────────────────────────────────────────────

function ProductMini({
  product,
  onDelete,
  onToggleSold,
}: {
  product: LocalProduct;
  onDelete: () => void;
  onToggleSold: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const coverImage = product.images?.[0];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <Link href={`/producto/${product.id}`}>
        <div style={{ position: "relative", height: 96 }}>
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ background: product.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              {product.emoji}
            </div>
          )}
          {/* Badge vendido */}
          {product.sold && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "3px 10px", borderRadius: 4, letterSpacing: 1, textTransform: "uppercase" }}>
                Vendido
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: "9px 11px 4px" }}>
          <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 3, color: product.sold ? "var(--text-3)" : "var(--text)", textDecoration: product.sold ? "line-through" : "none" }}>
            {product.title}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: product.sold ? "var(--text-3)" : "var(--green)", letterSpacing: -0.3 }}>
            {product.price}
          </div>
        </div>
      </Link>

      {/* Acciones — fila 1: editar + destacar + marcar vendido */}
      <div style={{ padding: "6px 11px 0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={`/editar/${product.id}`}
          style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}
        >
          Editar
        </Link>
        {!product.sold && (
          <Link
            href={`/destacar/${product.id}`}
            style={{
              fontSize: 11, fontWeight: 600, textDecoration: "none",
              color: product.featured ? "#d97706" : "var(--text-3)",
            }}
          >
            {product.featured ? "⭐ Destacado" : "⭐ Destacar"}
          </Link>
        )}
        <button
          onClick={onToggleSold}
          style={{ fontSize: 11, color: product.sold ? "var(--text-2)" : "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {product.sold ? "Activar" : "Marcar vendido"}
        </button>
      </div>

      {/* Acciones — fila 2: eliminar */}
      <div style={{ padding: "4px 11px 10px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Eliminar
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>¿Seguro?</span>
            <button onClick={onDelete} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>Sí</button>
            <button onClick={() => setConfirm(false)} style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>No</button>
          </div>
        )}
      </div>
    </div>
  );
}
