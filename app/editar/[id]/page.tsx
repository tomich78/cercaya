"use client";
import type { ReactNode } from "react";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getProductById, updateProduct, uploadProductImages, type LocalProduct } from "../../lib/storage";
import { getCurrentUser, type LocalUser } from "../../lib/auth";
import {
  PRODUCT_CATEGORIES, SERVICE_CATEGORIES, PROPERTY_TYPES, VEHICLE_TYPES,
  categoryColors as DATA_COLORS, categoryEmojis as DATA_EMOJIS,
} from "../../data";
import { useToast } from "../../components/ToastProvider";
import LocationInput from "../../components/LocationInput";
import { usePageTitle } from "../../lib/usePageTitle";

const MAX_IMAGES = 5;

function formatPrice(raw: string): string {
  if (!raw) return "";
  return "$" + Number(raw).toLocaleString("es-AR");
}

function inputStyle(hasError = false): React.CSSProperties {
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

function TwoCol({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      {children}
    </div>
  );
}

function rawFromPrice(price: string): string {
  return price.replace(/\D/g, "");
}

// Pills selector helper
function PillGroup({
  options, value, onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "5px 13px", borderRadius: 999,
            border: "1px solid",
            borderColor: value === opt ? "var(--green)" : "var(--border)",
            background:  value === opt ? "var(--green-subtle)" : "var(--surface)",
            color:       value === opt ? "var(--green)" : "var(--text-2)",
            fontWeight:  value === opt ? 600 : 400,
            fontSize: 13, cursor: "pointer",
          }}
        >{opt}</button>
      ))}
    </div>
  );
}

export default function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  usePageTitle("Editar publicación");
  const router     = useRouter();
  const { toast }  = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser]         = useState<LocalUser | null>(null);
  const [product, setProduct]   = useState<LocalProduct | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles]       = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [stock, setStock] = useState(1);

  // Common fields
  const [form, setForm] = useState({
    title:       "",
    priceRaw:    "",
    category:    "Electrónica",
    emoji:       "💻",
    description: "",
    location:    "",
    condition:   "Usado" as "Nuevo" | "Usado",
  });

  // Type-specific attributes
  const [attrs, setAttrs] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }

      const p = await getProductById(Number(id));
      if (!p) { router.replace("/perfil"); return; }

      if (p.userId !== u.id) { setNotAllowed(true); setLoading(false); return; }

      setUser(u);
      setProduct(p);

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
      setStock(p.stock ?? 1);

      // Pre-fill type-specific attributes
      if (p.attributes) {
        const raw: Record<string, string> = {};
        for (const [k, v] of Object.entries(p.attributes)) {
          raw[k] = String(v ?? "");
        }
        setAttrs(raw);
      }

      setLoading(false);
    })();
  }, [id, router]);

  useEffect(() => {
    return () => { newPreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [newPreviews]);

  const listingType = product?.listingType ?? "product";
  const totalImages = existingImages.length + newFiles.length;
  const bg           = DATA_COLORS[form.category] ?? "#f5f5f3";
  const emojis       = DATA_EMOJIS[form.category] ?? [];
  const priceDisplay = formatPrice(form.priceRaw);

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  }

  function setAttr(key: string, val: string) {
    setAttrs(a => ({ ...a, [key]: val }));
  }

  function handleCategoryChange(cat: string) {
    const firstEmoji = DATA_EMOJIS[cat]?.[0] ?? "📦";
    const oldEmojis  = DATA_EMOJIS[form.category] ?? [];
    const emojiInOld = oldEmojis.includes(form.emoji);
    setForm(f => ({ ...f, category: cat, emoji: emojiInOld ? firstEmoji : f.emoji }));
  }

  function handleServiceCategoryChange(cat: string) {
    const firstEmoji = DATA_EMOJIS[cat]?.[0] ?? "🛠️";
    setForm(f => ({ ...f, category: cat, emoji: firstEmoji }));
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
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadProductImages(user.id, newFiles);
      }
      const allImages = [...existingImages, ...uploadedUrls];

      // Build attributes object — filter out empty strings
      const builtAttrs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attrs)) {
        if (v !== "" && v !== undefined) builtAttrs[k] = v;
      }

      await updateProduct(product.id, {
        title:       form.title,
        price:       priceDisplay,
        category:    form.category,
        emoji:       form.emoji,
        bg,
        description: form.description,
        condition:   listingType === "product" || listingType === "vehicle" ? form.condition : undefined,
        location:    form.location,
        images:      allImages,
        lat:         locationLat,
        lng:         locationLng,
        stock:       listingType === "product" ? stock : undefined,
        attributes:  builtAttrs,
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

  const allPreviews: { src: string; isNew: boolean; index: number }[] = [
    ...existingImages.map((src, i) => ({ src, isNew: false, index: i })),
    ...newPreviews.map((src, i)    => ({ src, isNew: true,  index: i })),
  ];
  const previewMainImage = allPreviews[0]?.src ?? null;

  // Type label for header
  const typeLabel =
    listingType === "service"  ? "🔧 Servicio" :
    listingType === "property" ? "🏠 Inmueble" :
    listingType === "vehicle"  ? "🚗 Vehículo" : null;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/perfil" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Mi perfil
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
            Editar publicación
          </h1>
          {typeLabel && (
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
              padding: "3px 9px", borderRadius: 4,
              background: listingType === "service"
                ? "rgba(37,99,235,0.1)"  : listingType === "property"
                ? "rgba(124,58,237,0.1)" : "rgba(220,38,38,0.1)",
              color: listingType === "service"
                ? "rgb(37,99,235)"  : listingType === "property"
                ? "rgb(124,58,237)" : "rgb(220,38,38)",
            }}>
              {typeLabel}
            </span>
          )}
        </div>

        <div className="two-col-publish">

          {/* ───── Formulario ───── */}
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
                      position: "relative", width: 80, height: 80,
                      borderRadius: 6, overflow: "hidden", flexShrink: 0,
                      border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {i === 0 && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "rgba(0,0,0,0.45)", fontSize: 9, color: "#fff",
                        textAlign: "center", padding: "2px 0", fontWeight: 600, letterSpacing: 0.3,
                      }}>PRINCIPAL</div>
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
                    >×</button>
                  </div>
                ))}
                {totalImages < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 80, height: 80,
                      border: "1.5px dashed var(--border)", borderRadius: 6,
                      background: "var(--bg)", cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 4, color: "var(--text-3)", flexShrink: 0,
                      transition: "border-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{totalImages === 0 ? "Agregar foto" : "Agregar más"}</span>
                  </button>
                )}
              </div>
              {totalImages === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
                  Podés subir hasta {MAX_IMAGES} fotos. La primera será la imagen principal.
                </div>
              )}
            </Section>

            {/* ── Información básica ── */}
            <Section title="Información básica">
              <Field label="Título" error={errors.title}>
                <input
                  value={form.title}
                  onChange={e => setField("title", e.target.value)}
                  placeholder="Ej: iPhone 13 128GB libre"
                  style={inputStyle(!!errors.title)}
                />
              </Field>
              <Field label={listingType === "service" ? "Precio ($ por hora / trabajo / mes)" : listingType === "property" ? "Precio / Alquiler mensual ($)" : "Precio ($)"} error={errors.priceRaw}>
                <input
                  value={form.priceRaw}
                  onChange={e => setField("priceRaw", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 250000"
                  inputMode="numeric"
                  style={inputStyle(!!errors.priceRaw)}
                />
                {form.priceRaw && (
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    Se mostrará como <strong style={{ color: "var(--green)" }}>{priceDisplay}</strong>
                  </div>
                )}
              </Field>

              {/* Condición — productos y vehículos */}
              {(listingType === "product" || listingType === "vehicle") && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>
                    Condición
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["Nuevo", "Usado"] as const).map(c => (
                      <button
                        key={c}
                        type="button"
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
              )}

              {/* Stock — solo productos */}
              {listingType === "product" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>
                    Stock disponible
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button type="button" onClick={() => setStock(s => Math.max(1, s - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, flexShrink: 0 }}>−</button>
                    <input
                      type="number" min={1} max={999} value={stock}
                      onChange={e => { const v = Number(e.target.value); if (!isNaN(v) && v >= 1 && v <= 999) setStock(v); }}
                      style={{ width: 64, textAlign: "center", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)", background: "var(--bg)", outline: "none" }}
                    />
                    <button type="button" onClick={() => setStock(s => Math.min(999, s + 1))} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, flexShrink: 0 }}>+</button>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{stock === 1 ? "1 unidad" : `${stock} unidades`}</span>
                  </div>
                </div>
              )}
            </Section>

            {/* ── Categoría / Tipo ── */}
            <Section title={
              listingType === "service"  ? "Tipo de servicio" :
              listingType === "property" ? "Tipo de inmueble" :
              listingType === "vehicle"  ? "Tipo de vehículo" : "Categoría"
            }>
              {/* Productos */}
              {listingType === "product" && (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {PRODUCT_CATEGORIES.filter(c => c !== "Todos").map(cat => (
                      <button key={cat} type="button" onClick={() => handleCategoryChange(cat)} style={{ padding: "5px 13px", borderRadius: 999, border: "1px solid", borderColor: form.category === cat ? "var(--green)" : "var(--border)", background: form.category === cat ? "var(--green-subtle)" : "var(--surface)", color: form.category === cat ? "var(--green)" : "var(--text-2)", fontWeight: form.category === cat ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{cat}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 8 }}>Elegí un ícono</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {emojis.map(em => (
                      <button key={em} type="button" onClick={() => setField("emoji", em)} style={{ width: 40, height: 40, fontSize: 20, borderRadius: 6, border: "1px solid", borderColor: form.emoji === em ? "var(--green)" : "var(--border)", background: form.emoji === em ? "var(--green-subtle)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>{em}</button>
                    ))}
                  </div>
                </>
              )}

              {/* Servicios */}
              {listingType === "service" && (
                <PillGroup
                  options={SERVICE_CATEGORIES.filter(c => c !== "Todos")}
                  value={form.category}
                  onChange={handleServiceCategoryChange}
                />
              )}

              {/* Inmuebles */}
              {listingType === "property" && (
                <PillGroup
                  options={PROPERTY_TYPES.filter(c => c !== "Todos")}
                  value={form.category}
                  onChange={cat => {
                    const firstEmoji = DATA_EMOJIS[cat]?.[0] ?? "🏠";
                    setForm(f => ({ ...f, category: cat, emoji: firstEmoji }));
                  }}
                />
              )}

              {/* Vehículos */}
              {listingType === "vehicle" && (
                <PillGroup
                  options={VEHICLE_TYPES.filter(c => c !== "Todos")}
                  value={form.category}
                  onChange={cat => {
                    const firstEmoji = DATA_EMOJIS[cat]?.[0] ?? "🚗";
                    setForm(f => ({ ...f, category: cat, emoji: firstEmoji }));
                  }}
                />
              )}
            </Section>

            {/* ── Atributos de servicio ── */}
            {listingType === "service" && (
              <Section title="Detalles del servicio">
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Modalidad</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { value: "presencial", label: "📍 Presencial" },
                      { value: "remoto",     label: "💻 Remoto" },
                      { value: "ambos",      label: "📍/💻 Ambos" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAttr("modalidad", opt.value)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid", borderColor: attrs.modalidad === opt.value ? "var(--green)" : "var(--border)", background: attrs.modalidad === opt.value ? "var(--green-subtle)" : "var(--surface)", color: attrs.modalidad === opt.value ? "var(--green)" : "var(--text-2)", fontWeight: attrs.modalidad === opt.value ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Tipo de precio</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { value: "hora",     label: "Por hora" },
                      { value: "trabajo",  label: "Por trabajo" },
                      { value: "mes",      label: "Por mes" },
                      { value: "convenir", label: "A convenir" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAttr("precioTipo", opt.value)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid", borderColor: attrs.precioTipo === opt.value ? "var(--green)" : "var(--border)", background: attrs.precioTipo === opt.value ? "var(--green-subtle)" : "var(--surface)", color: attrs.precioTipo === opt.value ? "var(--green)" : "var(--text-2)", fontWeight: attrs.precioTipo === opt.value ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <Field label="Disponibilidad (opcional)">
                  <input
                    value={attrs.disponibilidad ?? ""}
                    onChange={e => setAttr("disponibilidad", e.target.value)}
                    placeholder="Ej: Lunes a viernes 9-18hs"
                    style={inputStyle()}
                  />
                </Field>
              </Section>
            )}

            {/* ── Atributos de inmueble ── */}
            {listingType === "property" && (
              <Section title="Detalles del inmueble">
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Operación</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { value: "venta",         label: "🏷️ Venta" },
                      { value: "alquiler",       label: "🔑 Alquiler" },
                      { value: "alquiler_temp",  label: "📅 Alquiler temporal" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAttr("operacion", opt.value)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid", borderColor: attrs.operacion === opt.value ? "var(--green)" : "var(--border)", background: attrs.operacion === opt.value ? "var(--green-subtle)" : "var(--surface)", color: attrs.operacion === opt.value ? "var(--green)" : "var(--text-2)", fontWeight: attrs.operacion === opt.value ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <TwoCol>
                  <Field label="Superficie (m²)">
                    <input value={attrs.superficie ?? ""} onChange={e => setAttr("superficie", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 85" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <Field label="Ambientes">
                    <input value={attrs.ambientes ?? ""} onChange={e => setAttr("ambientes", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 3" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <Field label="Dormitorios">
                    <input value={attrs.dormitorios ?? ""} onChange={e => setAttr("dormitorios", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 2" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <Field label="Baños">
                    <input value={attrs.banos ?? ""} onChange={e => setAttr("banos", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 1" inputMode="numeric" style={inputStyle()} />
                  </Field>
                </TwoCol>
                <TwoCol>
                  <Field label="Expensas ($/mes, opcional)">
                    <input value={attrs.expensas ?? ""} onChange={e => setAttr("expensas", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 15000" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={attrs.garaje === "true"}
                        onChange={e => setAttr("garaje", e.target.checked ? "true" : "")}
                        style={{ width: 16, height: 16, accentColor: "var(--green)", cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 500, color: "var(--text-2)" }}>Incluye garaje 🚗</span>
                    </label>
                  </div>
                </TwoCol>
              </Section>
            )}

            {/* ── Atributos de vehículo ── */}
            {listingType === "vehicle" && (
              <Section title="Detalles del vehículo">
                <TwoCol>
                  <Field label="Marca">
                    <input value={attrs.marca ?? ""} onChange={e => setAttr("marca", e.target.value)} placeholder="Ej: Toyota" style={inputStyle()} />
                  </Field>
                  <Field label="Modelo">
                    <input value={attrs.modelo ?? ""} onChange={e => setAttr("modelo", e.target.value)} placeholder="Ej: Corolla" style={inputStyle()} />
                  </Field>
                  <Field label="Año">
                    <input value={attrs.anio ?? ""} onChange={e => setAttr("anio", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 2019" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <Field label="Kilómetros">
                    <input value={attrs.km ?? ""} onChange={e => setAttr("km", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 45000" inputMode="numeric" style={inputStyle()} />
                  </Field>
                  <Field label="Color">
                    <input value={attrs.color ?? ""} onChange={e => setAttr("color", e.target.value)} placeholder="Ej: Blanco" style={inputStyle()} />
                  </Field>
                </TwoCol>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Combustible</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["Nafta", "Diesel", "GNC", "Eléctrico", "Híbrido"].map(opt => (
                      <button key={opt} type="button" onClick={() => setAttr("combustible", opt.toLowerCase())} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid", borderColor: attrs.combustible === opt.toLowerCase() ? "var(--green)" : "var(--border)", background: attrs.combustible === opt.toLowerCase() ? "var(--green-subtle)" : "var(--surface)", color: attrs.combustible === opt.toLowerCase() ? "var(--green)" : "var(--text-2)", fontWeight: attrs.combustible === opt.toLowerCase() ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Transmisión</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ value: "manual", label: "Manual" }, { value: "automatica", label: "Automática" }].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAttr("transmision", opt.value)} style={{ padding: "6px 18px", borderRadius: 6, border: "1px solid", borderColor: attrs.transmision === opt.value ? "var(--green)" : "var(--border)", background: attrs.transmision === opt.value ? "var(--green-subtle)" : "var(--surface)", color: attrs.transmision === opt.value ? "var(--green)" : "var(--text-2)", fontWeight: attrs.transmision === opt.value ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              </Section>
            )}

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
              <Field label={listingType === "service" ? "Zona donde trabajás" : listingType === "property" ? "Ubicación del inmueble" : "Zona"} error={errors.location}>
                <LocationInput
                  value={form.location}
                  onChange={(name, lat, lng) => { setField("location", name); setLocationLat(lat); setLocationLng(lng); }}
                  onClear={() => { setField("location", ""); setLocationLat(null); setLocationLng(null); }}
                  hasError={!!errors.location}
                />
              </Field>
            </Section>

            {/* Acciones */}
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/perfil"
                style={{ flex: 1, textAlign: "center", padding: "11px", fontSize: 14, fontWeight: 500, border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-2)", textDecoration: "none", background: "var(--surface)" }}
              >
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ flex: 2, background: "var(--green)", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontSize: 14, fontWeight: 500, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, letterSpacing: -0.1 }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {/* ───── Preview ───── */}
          <div className="hide-mobile sticky-col">
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 }}>
              Vista previa
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {previewMainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewMainImage} alt="preview" style={{ width: "100%", height: 128, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ background: bg, height: 128, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                  {form.emoji}
                </div>
              )}
              <div style={{ padding: "11px 13px 13px" }}>
                {typeLabel && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, marginBottom: 6, color: "var(--text-3)", textTransform: "uppercase" as const }}>{typeLabel}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.35, minHeight: 18 }}>
                  {form.title || <span style={{ color: "var(--text-3)" }}>Título</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--green)", marginBottom: 7, letterSpacing: -0.3, minHeight: 20 }}>
                  {priceDisplay || <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 13 }}>Precio</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {form.location || "Ubicación"}
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
