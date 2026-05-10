"use client";
import type { ReactNode } from "react";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getProductById, updateProduct, uploadProductImages, type LocalProduct } from "../../lib/storage";
import { getCurrentUser, type LocalUser } from "../../lib/auth";
import { categories } from "../../data";
import { useToast } from "../../components/ToastProvider";
import LocationInput from "../../components/LocationInput";

const MAX_IMAGES = 5;

const categoryColors: Record<string, string> = {
  "Electrónica": "#dbeafe",
  "Ropa":        "#fce7f3",
  "Hogar":       "#d1fae5",
  "Arte":        "#fef3c7",
  "Deportes":    "#e0f2fe",
  "Vehículos":   "#f3e8ff",
};

const categoryEmojis: Record<string, string[]> = {
  "Electrónica": ["💻", "📱", "🖥️", "⌨️", "🖱️", "🎧", "📷", "🎮", "📺", "🔋"],
  "Ropa":        ["👗", "👟", "👔", "🧥", "👜", "🕶️", "👒", "🧣", "👞", "🧤"],
  "Hogar":       ["🛋️", "🪑", "🛏️", "🪴", "🍳", "🪞", "🛁", "🖼️", "💡", "🧹"],
  "Arte":        ["🎨", "📚", "🎵", "🎸", "🎹", "📷", "✏️", "🎭", "🎬", "🧵"],
  "Deportes":    ["🚲", "⚽", "🎾", "🏋️", "🛹", "🏊", "⛷️", "🥊", "🎯", "🏄"],
  "Vehículos":   ["🚗", "🏍️", "🚐", "🚚", "🛵", "🚙", "🏎️", "🚕", "🛻", "🚌"],
};

function formatPrice(raw: string): string {
  if (!raw) return "";
  return "$" + Number(raw).toLocaleString("es-AR");
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${hasError ? "#dc2626" : "var(--border)"}`,
    borderRadius: 6,
    fontSize: 13,
    color: "var(--text)",
    background: "var(--bg)",
    outline: "none",
    fontFamily: "inherit",
  };
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Strip "$" and thousand separators to get raw number string
function rawFromPrice(price: string): string {
  return price.replace(/\D/g, "");
}

export default function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser]         = useState<LocalUser | null>(null);
  const [product, setProduct]   = useState<LocalProduct | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  // Existing images (URLs already in Supabase)
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // New files added in this session
  const [newFiles, setNewFiles]       = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "", priceRaw: "", category: "Electrónica",
    emoji: "💻", description: "", location: "",
    condition: "Usado" as "Nuevo" | "Usado",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }

      const p = await getProductById(Number(id));
      if (!p) { router.replace("/perfil"); return; }

      // Only the owner can edit
      if (p.userId !== u.id) { setNotAllowed(true); setLoading(false); return; }

      setUser(u);
      setProduct(p);

      // Pre-fill form
      setForm({
        title:       p.title,
        priceRaw:    rawFromPrice(p.price),
        category:    p.category,
        emoji:       p.emoji,
        description: p.description,
        location:    p.location,
        condition:   p.condition ?? "Usado",
      });
      setLocationLat(p.lat ?? null);
      setLocationLng(p.lng ?? null);
      setExistingImages(p.images ?? []);
      setLoading(false);
    })();
  }, [id, router]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => { newPreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [newPreviews]);

  const totalImages = existingImages.length + newFiles.length;
  const bg           = categoryColors[form.category] ?? "#f5f5f3";
  const emojis       = categoryEmojis[form.category] ?? [];
  const priceDisplay = formatPrice(form.priceRaw);

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  }

  function handleCategoryChange(cat: string) {
    const firstEmoji = categoryEmojis[cat]?.[0] ?? "📦";
    // Only auto-switch emoji if current emoji belongs to old category
    const oldEmojis  = categoryEmojis[form.category] ?? [];
    const emojiInOld = oldEmojis.includes(form.emoji);
    setForm(f => ({ ...f, category: cat, emoji: emojiInOld ? firstEmoji : f.emoji }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected  = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const remaining = MAX_IMAGES - totalImages;
    const toAdd     = selected.slice(0, remaining);
    const previews  = toAdd.map(f => URL.createObjectURL(f));
    setNewFiles(prev => [...prev, ...toAdd]);
    setNewPreviews(prev => [...prev, ...previews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeExistingImage(index: number) {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim())       e.title       = "Obligatorio";
    if (!form.priceRaw)           e.priceRaw    = "Obligatorio";
    if (!form.description.trim()) e.description = "Obligatorio";
    if (!form.location.trim())    e.location    = "Obligatorio";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user || !product) return;

    setSaving(true);
    try {
      // Upload new images
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadProductImages(user.id, newFiles);
      }

      const allImages = [...existingImages, ...uploadedUrls];

      await updateProduct(product.id, {
        title:       form.title,
        price:       priceDisplay,
        category:    form.category,
        emoji:       form.emoji,
        bg,
        description: form.description,
        condition:   form.condition,
        location:    form.location,
        images:      allImages,
        lat:         locationLat,
        lng:         locationLng,
      });

      toast("¡Publicación actualizada!");
      router.push("/perfil");
    } catch {
      toast("Error al guardar. Intentá de nuevo.", "error");
      setSaving(false);
    }
  }

  if (loading) return <div><Navbar /></div>;

  if (notAllowed) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 500, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin acceso</div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Solo podés editar tus propias publicaciones.
        </div>
        <Link href="/perfil" style={{ fontSize: 13, color: "var(--green)" }}>← Volver al perfil</Link>
      </div>
    </div>
  );

  // Build combined image list for display: existing first, then new previews
  const allPreviews: { src: string; isNew: boolean; index: number }[] = [
    ...existingImages.map((src, i) => ({ src, isNew: false, index: i })),
    ...newPreviews.map((src, i)    => ({ src, isNew: true,  index: i })),
  ];

  const previewMainImage = allPreviews[0]?.src ?? null;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/perfil" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Mi perfil
        </Link>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 24, letterSpacing: -0.5 }}>
          Editar publicación
        </h1>

        <div className="two-col-publish">

          {/* Formulario */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Fotos ── */}
            <Section title={`Fotos (${totalImages}/${MAX_IMAGES})`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allPreviews.map((item, i) => (
                  <div
                    key={item.src}
                    style={{
                      position: "relative",
                      width: 80, height: 80,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt={`foto ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {i === 0 && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "rgba(0,0,0,0.45)",
                        fontSize: 9, color: "#fff", textAlign: "center",
                        padding: "2px 0", fontWeight: 600, letterSpacing: 0.3,
                      }}>
                        PRINCIPAL
                      </div>
                    )}
                    <button
                      onClick={() => item.isNew ? removeNewImage(item.index) : removeExistingImage(item.index)}
                      style={{
                        position: "absolute", top: 3, right: 3,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)", border: "none",
                        color: "#fff", fontSize: 11, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1, padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {totalImages < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 80, height: 80,
                      border: "1.5px dashed var(--border)",
                      borderRadius: 6,
                      background: "var(--bg)",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 4, color: "var(--text-3)",
                      transition: "border-color 0.12s, color 0.12s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>
                      {totalImages === 0 ? "Agregar foto" : "Agregar más"}
                    </span>
                  </button>
                )}
              </div>

              {totalImages === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
                  Podés subir hasta {MAX_IMAGES} fotos. La primera será la imagen principal.
                </div>
              )}
            </Section>

            {/* ── Info básica ── */}
            <Section title="Información básica">
              <Field label="Título" error={errors.title}>
                <input
                  value={form.title}
                  onChange={e => setField("title", e.target.value)}
                  placeholder="Ej: iPhone 13 128GB libre"
                  style={inputStyle(!!errors.title)}
                />
              </Field>
              <Field label="Precio" error={errors.priceRaw}>
                <input
                  value={form.priceRaw}
                  onChange={e => setField("priceRaw", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 250000"
                  inputMode="numeric"
                  style={inputStyle(!!errors.priceRaw)}
                />
                {form.priceRaw && (
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    Se mostrará como{" "}
                    <strong style={{ color: "var(--green)" }}>{priceDisplay}</strong>
                  </div>
                )}
              </Field>
              <div style={{ marginBottom: 2 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>
                  Condición
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["Nuevo", "Usado"] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, condition: c }))}
                      style={{
                        padding: "6px 18px", borderRadius: 6, fontSize: 13,
                        border: "1px solid",
                        borderColor: form.condition === c ? "var(--green)" : "var(--border)",
                        background:  form.condition === c ? "var(--green-subtle)" : "var(--surface)",
                        color:       form.condition === c ? "var(--green)" : "var(--text-2)",
                        fontWeight:  form.condition === c ? 600 : 400,
                        cursor: "pointer",
                      }}
                    >{c}</button>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Categoría ── */}
            <Section title="Categoría">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {categories.filter(c => c !== "Todos").map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    style={{
                      padding: "5px 13px", borderRadius: 999,
                      border: "1px solid",
                      borderColor: form.category === cat ? "var(--green)" : "var(--border)",
                      background:  form.category === cat ? "var(--green-subtle)" : "var(--surface)",
                      color:       form.category === cat ? "var(--green)" : "var(--text-2)",
                      fontWeight:  form.category === cat ? 600 : 400,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >{cat}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 8 }}>Elegí un ícono</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {emojis.map(em => (
                  <button
                    key={em}
                    onClick={() => setField("emoji", em)}
                    style={{
                      width: 40, height: 40, fontSize: 20, borderRadius: 6,
                      border: "1px solid",
                      borderColor: form.emoji === em ? "var(--green)" : "var(--border)",
                      background:  form.emoji === em ? "var(--green-subtle)" : "var(--bg)",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.1s",
                    }}
                  >{em}</button>
                ))}
              </div>
            </Section>

            {/* ── Descripción ── */}
            <Section title="Descripción">
              <Field label="Descripción" error={errors.description}>
                <textarea
                  value={form.description}
                  onChange={e => setField("description", e.target.value)}
                  placeholder="Describí el estado, qué incluye, condiciones de entrega..."
                  rows={4}
                  style={{ ...inputStyle(!!errors.description), resize: "vertical", lineHeight: 1.65 }}
                />
              </Field>
            </Section>

            {/* ── Ubicación ── */}
            <Section title="Ubicación">
              <Field label="Zona del producto" error={errors.location}>
                <LocationInput
                  value={form.location}
                  onChange={(name, lat, lng) => {
                    setField("location", name);
                    setLocationLat(lat);
                    setLocationLng(lng);
                  }}
                  onClear={() => { setField("location", ""); setLocationLat(null); setLocationLng(null); }}
                  hasError={!!errors.location}
                />
              </Field>
            </Section>

            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/perfil"
                style={{
                  flex: 1, textAlign: "center",
                  padding: "11px", fontSize: 14, fontWeight: 500,
                  border: "1px solid var(--border)", borderRadius: 6,
                  color: "var(--text-2)", textDecoration: "none",
                  background: "var(--surface)",
                }}
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: 2,
                  background: "var(--green)", color: "#fff",
                  border: "none", borderRadius: 6,
                  padding: "11px", fontSize: 14, fontWeight: 500,
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  letterSpacing: -0.1,
                }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="hide-mobile sticky-col">
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 }}>
              Vista previa
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {previewMainImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewMainImage}
                  alt="preview"
                  style={{ width: "100%", height: 128, objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ background: bg, height: 128, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                  {form.emoji}
                </div>
              )}
              <div style={{ padding: "11px 13px 13px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.35, minHeight: 18 }}>
                  {form.title || <span style={{ color: "var(--text-3)" }}>Título del producto</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--green)", marginBottom: 7, letterSpacing: -0.3, minHeight: 20 }}>
                  {priceDisplay || <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 13 }}>Precio</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                  <span>{form.location || "Ubicación"}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, lineHeight: 1.5 }}>
              Así vas a aparecer en el feed de compradores.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
