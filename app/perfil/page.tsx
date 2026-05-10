"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import LocationInput from "../components/LocationInput";
import { getCurrentUser, updateUser, uploadAvatar, uploadDniDoc, type LocalUser } from "../lib/auth";
import { getLocalProducts, deleteLocalProduct, updateProduct, type LocalProduct } from "../lib/storage";
import { getReviewsForSeller, type Review } from "../lib/reviews";
import { useToast } from "../components/ToastProvider";

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
    setMyProducts((await getLocalProducts()).filter(p => p.userId === u.id));
    setMyReviews(await getReviewsForSeller(u.id));
  }

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login?redirect=/perfil"); return; }
      setUser(u);
      setMyProducts((await getLocalProducts()).filter(p => p.userId === u.id));
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

      {/* Acciones — fila 1: editar + marcar vendido */}
      <div style={{ padding: "6px 11px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href={`/editar/${product.id}`}
          style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}
        >
          Editar
        </Link>
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
