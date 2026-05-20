"use client";
import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { saveLocalProduct, uploadProductImages, getLocalProducts } from "../lib/storage";
import { getCurrentUser, type LocalUser } from "../lib/auth";
import {
  LISTING_TYPES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES,
  PROPERTY_TYPES, VEHICLE_TYPES, categoryEmojis, categoryColors,
  type ListingType,
} from "../data";
import { useToast } from "../components/ToastProvider";
import LocationInput from "../components/LocationInput";
import { usePageTitle } from "../lib/usePageTitle";
import ExcelUpload from "./ExcelUpload";

const MAX_IMAGES    = 5;
const MAX_DESC      = 800;
const MAX_PRODUCTS  = 20; // límite para cuentas normales (negocio = sin límite)

/* ── helpers ──────────────────────────────────────────────────── */
function formatPrice(raw: string): string {
  if (!raw) return "";
  return "$" + Number(raw).toLocaleString("es-AR");
}

function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%", padding: "8px 10px",
    border: `1px solid ${hasError ? "var(--red)" : "var(--border)"}`,
    borderRadius: 6, fontSize: 13,
    color: "var(--text)", background: "var(--bg)",
    outline: "none", fontFamily: "inherit",
  };
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {hint  && !error && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{error}</div>}
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

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 13, border: "1px solid",
      borderColor: active ? "var(--green)" : "var(--border)",
      background:  active ? "var(--green-subtle)" : "var(--surface)",
      color:       active ? "var(--green)" : "var(--text-2)",
      fontWeight:  active ? 600 : 400, cursor: "pointer",
    }}>{children}</button>
  );
}

/* ── Selector de tipo ─────────────────────────────────────────── */
function TypeSelector({ onSelect }: { onSelect: (t: ListingType) => void }) {
  return (
    <div>
      <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
        ¿Qué querés publicar?
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>
        Elegí el tipo de publicación para ver los campos correspondientes.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {LISTING_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "20px 18px", cursor: "pointer",
              textAlign: "left", transition: "border-color 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow  = "0 0 0 3px var(--green-subtle)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>{t.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, letterSpacing: -0.3 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────────── */
export default function PublicarPage() {
  usePageTitle("Publicar");
  const router     = useRouter();
  const { toast }  = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user,      setUser]      = useState<LocalUser | null>(null);
  const [checking,  setChecking]  = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mode,      setMode]      = useState<"manual" | "excel">("manual");
  const [listingType, setListingType] = useState<ListingType | null>(null);

  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [locationLat,   setLocationLat]   = useState<number | null>(null);
  const [locationLng,   setLocationLng]   = useState<number | null>(null);

  // Campos comunes
  const [form, setForm] = useState({
    title:      "",
    priceRaw:   "",
    description:"",
    location:   "",
    phone:      "",
    negotiable: false,
    // Producto
    category:   "Electrónica",
    emoji:      "💻",
    condition:  "Usado" as "Nuevo" | "Usado",
    delivery:   "retiro" as "retiro" | "envio" | "ambos",
    stock:      1,
    // Servicio
    serviceCategory: "Plomería",
    modalidad:       "presencial" as "presencial" | "remoto" | "ambos",
    precioTipo:      "trabajo" as "hora" | "trabajo" | "mes" | "convenir",
    disponibilidad:  "",
    // Inmueble
    operacion:      "venta" as "venta" | "alquiler" | "alquiler_temp",
    tipoPropiedad:  "Casa",
    superficieM2:   "",
    ambientes:      "",
    dormitorios:    "",
    banos:          "",
    garaje:         false,
    expensas:       "",
    // Vehículo
    tipoVehiculo:   "Auto",
    marca:          "",
    modelo:         "",
    anio:           "",
    km:             "",
    combustible:    "nafta" as "nafta" | "diesel" | "electrico" | "gnc" | "hibrido",
    transmision:    "manual" as "manual" | "automatica",
    color:          "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    getCurrentUser().then(async u => {
      if (!u) { router.replace("/login?redirect=/publicar"); return; }
      setUser(u);
      // Verificar límite solo para cuentas normales
      if (!u.isBusiness || !u.businessPaid) {
        const all = await getLocalProducts();
        const active = all.filter(p => p.userId === u.id && !p.sold);
        if (active.length >= MAX_PRODUCTS) setLimitReached(true);
      }
      setChecking(false);
    });
  }, [router]);

  useEffect(() => {
    return () => { imagePreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [imagePreviews]);

  function setField(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected  = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const toAdd     = selected.slice(0, MAX_IMAGES - imageFiles.length);
    setImageFiles(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev    => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // Precio display según tipo
  const priceDisplay = (() => {
    if (!form.priceRaw) return "";
    if (listingType === "service") {
      if (form.precioTipo === "convenir") return "A convenir";
      const labels = { hora: "/hora", trabajo: " por trabajo", mes: "/mes" };
      return formatPrice(form.priceRaw) + (labels[form.precioTipo as keyof typeof labels] ?? "");
    }
    if (listingType === "property" && form.operacion !== "venta") {
      return formatPrice(form.priceRaw) + "/mes";
    }
    return formatPrice(form.priceRaw);
  })();

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim())       e.title       = "Obligatorio";
    if (!form.description.trim()) e.description = "Obligatorio";
    if (!form.location.trim())    e.location    = "Obligatorio";
    if (listingType !== "service" || form.precioTipo !== "convenir") {
      if (!form.priceRaw) e.priceRaw = "Obligatorio";
    }
    if (listingType === "vehicle") {
      if (!form.marca.trim())  e.marca  = "Obligatorio";
      if (!form.modelo.trim()) e.modelo = "Obligatorio";
      if (!form.anio)          e.anio   = "Obligatorio";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setUploading(true);
    try {
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadProductImages(user!.id, imageFiles);
      }

      // Determinar categoría y emoji según tipo
      const category = listingType === "service"  ? form.serviceCategory
        : listingType === "property" ? form.tipoPropiedad
        : listingType === "vehicle"  ? form.tipoVehiculo
        : form.category;

      const emoji = categoryEmojis[category]?.[0] ?? form.emoji;
      const bg    = categoryColors[category] ?? "#f5f5f3";

      // Atributos específicos por tipo
      const attributes: Record<string, unknown> = {};
      if (listingType === "service") {
        attributes.modalidad    = form.modalidad;
        attributes.precioTipo   = form.precioTipo;
        if (form.disponibilidad) attributes.disponibilidad = form.disponibilidad;
      } else if (listingType === "property") {
        attributes.operacion    = form.operacion;
        if (form.superficieM2)  attributes.superficieM2  = Number(form.superficieM2);
        if (form.ambientes)     attributes.ambientes     = Number(form.ambientes);
        if (form.dormitorios)   attributes.dormitorios   = Number(form.dormitorios);
        if (form.banos)         attributes.banos         = Number(form.banos);
        attributes.garaje       = form.garaje;
        if (form.expensas)      attributes.expensas      = Number(form.expensas);
      } else if (listingType === "vehicle") {
        attributes.marca        = form.marca;
        attributes.modelo       = form.modelo;
        if (form.anio)  attributes.anio  = Number(form.anio);
        if (form.km)    attributes.km    = Number(form.km);
        attributes.combustible  = form.combustible;
        attributes.transmision  = form.transmision;
        if (form.color) attributes.color = form.color;
      }

      // Condición solo para productos
      const condition = listingType === "product" ? form.condition : undefined;

      await saveLocalProduct({
        title:       form.title,
        price:       priceDisplay || formatPrice(form.priceRaw),
        category,
        emoji,
        description: form.description,
        location:    form.location,
        condition,
        images:      imageUrls,
        lat:         locationLat  ?? undefined,
        lng:         locationLng  ?? undefined,
        distance:    "Cerca tuyo",
        bg,
        verified:    false,
        userId:      user!.id,
        negotiable:  form.negotiable,
        delivery:    listingType === "product" ? form.delivery : "retiro",
        phone:       form.phone || undefined,
        stock:       listingType === "product" ? form.stock : 1,
        listingType: listingType ?? "product",
        attributes,
      });

      toast("¡Publicación creada con éxito!");
      router.push("/");
    } catch {
      toast("Error al publicar. Intentá de nuevo.", "error");
      setUploading(false);
    }
  }

  if (checking) return <div><Navbar /></div>;

  if (limitReached) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Límite de publicaciones alcanzado</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 24 }}>
          Las cuentas normales pueden tener hasta <strong>{MAX_PRODUCTS} publicaciones activas</strong>.<br />
          Vendé o eliminá alguna para publicar más, o activá el <strong>Modo Negocio</strong> para tener publicaciones ilimitadas.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/perfil" style={{ padding: "9px 20px", borderRadius: 7, background: "var(--green)", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Ver mis publicaciones
          </Link>
          <Link href="/anunciar" style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontWeight: 500, fontSize: 13, textDecoration: "none" }}>
            Ver Modo Negocio →
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: listingType ? 900 : 560, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Inicio
        </Link>

        {/* ── Sin tipo elegido: selector ── */}
        {!listingType ? (
          <TypeSelector onSelect={setListingType} />
        ) : (
          <>
            {/* Header con tipo seleccionado */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>
                {LISTING_TYPES.find(t => t.value === listingType)?.emoji}{" "}
                Nueva publicación — {LISTING_TYPES.find(t => t.value === listingType)?.label}
              </h1>
              <button
                onClick={() => setListingType(null)}
                style={{
                  fontSize: 12, color: "var(--text-3)", background: "none",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "5px 12px", cursor: "pointer",
                }}
              >
                ← Cambiar tipo
              </button>
            </div>

            {/* Toggle manual / excel (solo productos) */}
            {listingType === "product" && (
              <div style={{
                display: "flex", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: 4, marginBottom: 24,
              }}>
                {([
                  { value: "manual", label: "✏️  Publicación manual" },
                  { value: "excel",  label: "📊  Importar desde Excel" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 13,
                      border: "none",
                      background: mode === opt.value ? "var(--green-subtle)" : "none",
                      color:      mode === opt.value ? "var(--green)" : "var(--text-3)",
                      fontWeight: mode === opt.value ? 600 : 400,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            )}

            {listingType === "product" && mode === "excel" ? (
              <ExcelUpload userId={user!.id} onDone={() => router.push("/")} />
            ) : (
              <div className="two-col-publish">

                {/* ── Columna formulario ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Fotos */}
                  <Section title={`Fotos (${imageFiles.length}/${MAX_IMAGES})`}>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple
                      style={{ display: "none" }} onChange={handleFileChange} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {imagePreviews.map((src, i) => (
                        <div key={src} style={{
                          position: "relative", width: 80, height: 80, borderRadius: 6,
                          overflow: "hidden",
                          border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)",
                          flexShrink: 0,
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`foto ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {i === 0 && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", fontSize: 9, color: "#fff", textAlign: "center", padding: "2px 0", fontWeight: 600 }}>
                              PRINCIPAL
                            </div>
                          )}
                          <button onClick={() => removeImage(i)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
                        </div>
                      ))}
                      {imageFiles.length < MAX_IMAGES && (
                        <button onClick={() => fileInputRef.current?.click()} style={{
                          width: 80, height: 80, border: "1.5px dashed var(--border)",
                          borderRadius: 6, background: "var(--bg)", cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center",
                          justifyContent: "center", gap: 4, color: "var(--text-3)", flexShrink: 0,
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span style={{ fontSize: 10, fontWeight: 500 }}>{imageFiles.length === 0 ? "Agregar foto" : "Más"}</span>
                        </button>
                      )}
                    </div>
                    {imageFiles.length === 0 && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>Podés subir hasta {MAX_IMAGES} fotos. La primera será la principal.</div>}
                  </Section>

                  {/* Info básica */}
                  <Section title="Información básica">
                    <Field label="Título" error={errors.title}>
                      <input value={form.title} onChange={e => setField("title", e.target.value)}
                        placeholder={
                          listingType === "service"  ? "Ej: Plomero a domicilio — zona sur" :
                          listingType === "property" ? "Ej: Departamento 2 ambientes en Palermo" :
                          listingType === "vehicle"  ? "Ej: Toyota Corolla 2020 automático" :
                          "Ej: iPhone 13 128GB libre"
                        }
                        style={inputStyle(!!errors.title)} />
                    </Field>

                    {/* Precio */}
                    {(listingType !== "service" || form.precioTipo !== "convenir") && (
                      <Field label={
                        listingType === "service"  ? `Precio (${form.precioTipo === "hora" ? "por hora" : form.precioTipo === "mes" ? "por mes" : "por trabajo"})` :
                        listingType === "property" && form.operacion !== "venta" ? "Precio por mes" :
                        "Precio"
                      } error={errors.priceRaw}>
                        <input value={form.priceRaw}
                          onChange={e => setField("priceRaw", e.target.value.replace(/\D/g, ""))}
                          placeholder="Ej: 80000" inputMode="numeric"
                          style={inputStyle(!!errors.priceRaw)} />
                        {form.priceRaw && (
                          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                            Se mostrará como <strong style={{ color: "var(--green)" }}>{priceDisplay}</strong>
                          </div>
                        )}
                      </Field>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.negotiable}
                          onChange={e => setField("negotiable", e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: "var(--green)", cursor: "pointer", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--text-2)", userSelect: "none" }}>
                          {listingType === "service" ? "Precio a convenir (sin monto fijo)" : "Precio negociable"}
                        </span>
                      </label>
                    </div>
                  </Section>

                  {/* ── Campos específicos por tipo ── */}

                  {/* PRODUCTO */}
                  {listingType === "product" && (
                    <Section title="Detalles del producto">
                      {/* Categoría */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Categoría</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {PRODUCT_CATEGORIES.filter(c => c !== "Todos").map(cat => (
                            <button key={cat} onClick={() => { setField("category", cat); setField("emoji", categoryEmojis[cat]?.[0] ?? "📦"); }}
                              style={{
                                padding: "5px 12px", borderRadius: 999, fontSize: 12, border: "1px solid",
                                borderColor: form.category === cat ? "var(--green)" : "var(--border)",
                                background:  form.category === cat ? "var(--green-subtle)" : "var(--surface)",
                                color:       form.category === cat ? "var(--green)" : "var(--text-2)",
                                fontWeight:  form.category === cat ? 600 : 400, cursor: "pointer",
                              }}
                            >{cat}</button>
                          ))}
                        </div>
                        {/* Emojis */}
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 6 }}>Elegí un ícono</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(categoryEmojis[form.category] ?? []).map(em => (
                            <button key={em} onClick={() => setField("emoji", em)} style={{
                              width: 38, height: 38, fontSize: 19, borderRadius: 6, border: "1px solid",
                              borderColor: form.emoji === em ? "var(--green)" : "var(--border)",
                              background:  form.emoji === em ? "var(--green-subtle)" : "var(--bg)",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{em}</button>
                          ))}
                        </div>
                      </div>

                      {/* Condición */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Condición</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {(["Nuevo", "Usado"] as const).map(c => (
                            <ToggleButton key={c} active={form.condition === c} onClick={() => setField("condition", c)}>{c}</ToggleButton>
                          ))}
                        </div>
                      </div>

                      {/* Stock */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Stock disponible</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => setField("stock", Math.max(1, form.stock - 1))} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: form.stock <= 1 ? "default" : "pointer", fontSize: 17, color: form.stock <= 1 ? "var(--border)" : "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <input
                            type="number"
                            value={form.stock}
                            min={1} max={999}
                            onChange={e => setField("stock", Math.min(999, Math.max(1, parseInt(e.target.value) || 1)))}
                            style={{ width: 58, height: 30, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "inherit" }}
                          />
                          <button onClick={() => setField("stock", Math.min(999, form.stock + 1))} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 17, color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{form.stock === 1 ? "unidad" : "unidades"}</span>
                        </div>
                      </div>

                      {/* Entrega */}
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Forma de entrega</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([
                            { value: "retiro", label: "🤝 Retiro en persona" },
                            { value: "envio",  label: "📦 Envío" },
                            { value: "ambos",  label: "✅ Ambos" },
                          ] as const).map(opt => (
                            <ToggleButton key={opt.value} active={form.delivery === opt.value} onClick={() => setField("delivery", opt.value)}>{opt.label}</ToggleButton>
                          ))}
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* SERVICIO */}
                  {listingType === "service" && (
                    <Section title="Detalles del servicio">
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Categoría de servicio</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {SERVICE_CATEGORIES.filter(c => c !== "Todos").map(cat => (
                            <button key={cat} onClick={() => setField("serviceCategory", cat)} style={{
                              padding: "5px 12px", borderRadius: 999, fontSize: 12, border: "1px solid",
                              borderColor: form.serviceCategory === cat ? "var(--green)" : "var(--border)",
                              background:  form.serviceCategory === cat ? "var(--green-subtle)" : "var(--surface)",
                              color:       form.serviceCategory === cat ? "var(--green)" : "var(--text-2)",
                              fontWeight:  form.serviceCategory === cat ? 600 : 400, cursor: "pointer",
                            }}>{cat}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Modalidad</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([
                            { value: "presencial", label: "🏠 Presencial" },
                            { value: "remoto",     label: "💻 Remoto" },
                            { value: "ambos",      label: "✅ Ambos" },
                          ] as const).map(opt => (
                            <ToggleButton key={opt.value} active={form.modalidad === opt.value} onClick={() => setField("modalidad", opt.value)}>{opt.label}</ToggleButton>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Precio por</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([
                            { value: "hora",      label: "Por hora" },
                            { value: "trabajo",   label: "Por trabajo" },
                            { value: "mes",       label: "Por mes" },
                            { value: "convenir",  label: "A convenir" },
                          ] as const).map(opt => (
                            <ToggleButton key={opt.value} active={form.precioTipo === opt.value} onClick={() => setField("precioTipo", opt.value)}>{opt.label}</ToggleButton>
                          ))}
                        </div>
                      </div>

                      <Field label="Disponibilidad (opcional)" hint="Ej: Lunes a viernes de 9 a 18hs">
                        <input value={form.disponibilidad} onChange={e => setField("disponibilidad", e.target.value)}
                          placeholder="Ej: Lunes a viernes de 9 a 18hs" style={inputStyle()} />
                      </Field>
                    </Section>
                  )}

                  {/* INMUEBLE */}
                  {listingType === "property" && (
                    <Section title="Detalles del inmueble">
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Operación</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([
                            { value: "venta",         label: "🏷️ Venta" },
                            { value: "alquiler",      label: "🔑 Alquiler" },
                            { value: "alquiler_temp", label: "🌴 Alquiler temporario" },
                          ] as const).map(opt => (
                            <ToggleButton key={opt.value} active={form.operacion === opt.value} onClick={() => setField("operacion", opt.value)}>{opt.label}</ToggleButton>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Tipo de propiedad</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {PROPERTY_TYPES.filter(t => t !== "Todos").map(t => (
                            <button key={t} onClick={() => setField("tipoPropiedad", t)} style={{
                              padding: "5px 12px", borderRadius: 999, fontSize: 12, border: "1px solid",
                              borderColor: form.tipoPropiedad === t ? "var(--green)" : "var(--border)",
                              background:  form.tipoPropiedad === t ? "var(--green-subtle)" : "var(--surface)",
                              color:       form.tipoPropiedad === t ? "var(--green)" : "var(--text-2)",
                              fontWeight:  form.tipoPropiedad === t ? 600 : 400, cursor: "pointer",
                            }}>{t}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <Field label="Superficie (m²)">
                          <input value={form.superficieM2} onChange={e => setField("superficieM2", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 65" inputMode="numeric" style={inputStyle()} />
                        </Field>
                        <Field label="Ambientes">
                          <input value={form.ambientes} onChange={e => setField("ambientes", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 3" inputMode="numeric" style={inputStyle()} />
                        </Field>
                        <Field label="Dormitorios">
                          <input value={form.dormitorios} onChange={e => setField("dormitorios", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 2" inputMode="numeric" style={inputStyle()} />
                        </Field>
                        <Field label="Baños">
                          <input value={form.banos} onChange={e => setField("banos", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 1" inputMode="numeric" style={inputStyle()} />
                        </Field>
                      </div>

                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input type="checkbox" checked={form.garaje} onChange={e => setField("garaje", e.target.checked)}
                            style={{ width: 15, height: 15, accentColor: "var(--green)", cursor: "pointer" }} />
                          <span style={{ fontSize: 13, color: "var(--text-2)" }}>🚗 Garaje / cochera</span>
                        </label>
                      </div>

                      {form.operacion !== "venta" && (
                        <Field label="Expensas mensuales (opcional)">
                          <input value={form.expensas} onChange={e => setField("expensas", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 25000" inputMode="numeric" style={inputStyle()} />
                        </Field>
                      )}
                    </Section>
                  )}

                  {/* VEHÍCULO */}
                  {listingType === "vehicle" && (
                    <Section title="Detalles del vehículo">
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Tipo de vehículo</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {VEHICLE_TYPES.filter(t => t !== "Todos").map(t => (
                            <button key={t} onClick={() => setField("tipoVehiculo", t)} style={{
                              padding: "5px 12px", borderRadius: 999, fontSize: 12, border: "1px solid",
                              borderColor: form.tipoVehiculo === t ? "var(--green)" : "var(--border)",
                              background:  form.tipoVehiculo === t ? "var(--green-subtle)" : "var(--surface)",
                              color:       form.tipoVehiculo === t ? "var(--green)" : "var(--text-2)",
                              fontWeight:  form.tipoVehiculo === t ? 600 : 400, cursor: "pointer",
                            }}>{t}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Marca" error={errors.marca}>
                          <input value={form.marca} onChange={e => setField("marca", e.target.value)}
                            placeholder="Ej: Toyota" style={inputStyle(!!errors.marca)} />
                        </Field>
                        <Field label="Modelo" error={errors.modelo}>
                          <input value={form.modelo} onChange={e => setField("modelo", e.target.value)}
                            placeholder="Ej: Corolla" style={inputStyle(!!errors.modelo)} />
                        </Field>
                        <Field label="Año" error={errors.anio}>
                          <input value={form.anio} onChange={e => setField("anio", e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="Ej: 2018" inputMode="numeric" style={inputStyle(!!errors.anio)} />
                        </Field>
                        <Field label="Kilometraje" hint="Dejar vacío si es 0 km">
                          <input value={form.km} onChange={e => setField("km", e.target.value.replace(/\D/g, ""))}
                            placeholder="Ej: 45000" inputMode="numeric" style={inputStyle()} />
                        </Field>
                      </div>

                      <div style={{ marginTop: 14, marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Combustible</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([
                            { value: "nafta",    label: "⛽ Nafta" },
                            { value: "diesel",   label: "🛢️ Diésel" },
                            { value: "gnc",      label: "🔵 GNC" },
                            { value: "electrico",label: "⚡ Eléctrico" },
                            { value: "hibrido",  label: "♻️ Híbrido" },
                          ] as const).map(opt => (
                            <ToggleButton key={opt.value} active={form.combustible === opt.value} onClick={() => setField("combustible", opt.value)}>{opt.label}</ToggleButton>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-2)", marginBottom: 7 }}>Transmisión</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <ToggleButton active={form.transmision === "manual"}    onClick={() => setField("transmision", "manual")}>Manual</ToggleButton>
                          <ToggleButton active={form.transmision === "automatica"} onClick={() => setField("transmision", "automatica")}>Automática</ToggleButton>
                        </div>
                      </div>

                      <Field label="Color (opcional)">
                        <input value={form.color} onChange={e => setField("color", e.target.value)}
                          placeholder="Ej: Blanco" style={inputStyle()} />
                      </Field>
                    </Section>
                  )}

                  {/* Descripción */}
                  <Section title="Descripción">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Descripción</label>
                      <span style={{ fontSize: 11, color: form.description.length >= MAX_DESC ? "var(--red)" : "var(--text-3)", fontWeight: form.description.length >= MAX_DESC ? 600 : 400 }}>
                        {form.description.length}/{MAX_DESC}
                      </span>
                    </div>
                    <textarea value={form.description} onChange={e => setField("description", e.target.value.slice(0, MAX_DESC))}
                      placeholder={
                        listingType === "service"  ? "Describí qué incluye el servicio, tu experiencia, zona de cobertura..." :
                        listingType === "property" ? "Describí el estado del inmueble, ubicación exacta, comodidades..." :
                        listingType === "vehicle"  ? "Describí el estado general, historial de service, extras incluidos..." :
                        "Describí el estado, qué incluye, condiciones de entrega..."
                      }
                      rows={4} style={{ ...inputStyle(!!errors.description), resize: "vertical", lineHeight: 1.65 }} />
                    {errors.description && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{errors.description}</div>}
                  </Section>

                  {/* Ubicación */}
                  <Section title="Ubicación">
                    <Field label={listingType === "service" ? "Zona de cobertura" : listingType === "property" ? "Ubicación del inmueble" : "Zona"} error={errors.location}>
                      <LocationInput value={form.location}
                        onChange={(name, lat, lng) => { setField("location", name); setLocationLat(lat); setLocationLng(lng); }}
                        onClear={() => { setField("location", ""); setLocationLat(null); setLocationLng(null); }}
                        hasError={!!errors.location} />
                    </Field>
                  </Section>

                  {/* Contacto */}
                  <Section title="Contacto">
                    <Field label="WhatsApp (opcional)" hint="Si lo completás, los interesados podrán contactarte directamente.">
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-3)", pointerEvents: "none" }}>+54</span>
                        <input value={form.phone}
                          onChange={e => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 12))}
                          placeholder="11 2345 6789" inputMode="tel"
                          style={{ ...inputStyle(), paddingLeft: 38 }} />
                      </div>
                    </Field>
                  </Section>

                  <button onClick={handleSubmit} disabled={uploading} style={{
                    background: "var(--green)", color: "#fff", border: "none", borderRadius: 6,
                    padding: "11px", fontSize: 14, fontWeight: 500,
                    cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1,
                  }}>
                    {uploading ? "Publicando..." : "Publicar"}
                  </button>
                </div>

                {/* Vista previa */}
                <div className="hide-mobile sticky-col">
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 }}>
                    Vista previa
                  </div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    {imagePreviews[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreviews[0]} alt="preview" style={{ width: "100%", height: 128, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{
                        background: categoryColors[listingType === "service" ? form.serviceCategory : listingType === "property" ? form.tipoPropiedad : listingType === "vehicle" ? form.tipoVehiculo : form.category] ?? "#f5f5f3",
                        height: 128, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
                      }}>
                        {categoryEmojis[listingType === "service" ? form.serviceCategory : listingType === "property" ? form.tipoPropiedad : listingType === "vehicle" ? form.tipoVehiculo : form.category]?.[0] ?? form.emoji}
                      </div>
                    )}
                    <div style={{ padding: "11px 13px 13px" }}>
                      {/* Badge tipo */}
                      {listingType !== "product" && (
                        <div style={{ marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" as const,
                            padding: "2px 7px", borderRadius: 4,
                            background: listingType === "service" ? "#ede9fe" : listingType === "property" ? "#d1fae5" : "#dbeafe",
                            color:      listingType === "service" ? "#5b21b6" : listingType === "property" ? "#065f46" : "#1e40af",
                          }}>
                            {LISTING_TYPES.find(t => t.value === listingType)?.emoji} {LISTING_TYPES.find(t => t.value === listingType)?.label}
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.35, minHeight: 18 }}>
                        {form.title || <span style={{ color: "var(--text-3)" }}>Título de la publicación</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--green)", marginBottom: 5, letterSpacing: -0.3 }}>
                        {priceDisplay || <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 13 }}>Precio</span>}
                        {form.negotiable && <span style={{ fontSize: 10, background: "var(--green-subtle)", color: "var(--green)", borderRadius: 4, padding: "2px 6px", marginLeft: 6, fontWeight: 600 }}>Negociable</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                        <span>{form.location || "Ubicación"}</span>
                        <span style={{ color: "var(--green)", fontWeight: 500 }}>Cerca tuyo</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, lineHeight: 1.5 }}>
                    Así vas a aparecer en el feed.
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
