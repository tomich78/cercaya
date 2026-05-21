"use client";
import { useRef, useState, useEffect } from "react";
import { saveLocalProduct, uploadProductImages } from "../lib/storage";
import { useToast } from "../components/ToastProvider";

// ── Constantes compartidas ────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  "Electrónica", "Ropa", "Hogar", "Arte", "Deportes", "Vehículos",
  "Herramientas", "Juguetes", "Libros", "Mascotas", "Bebés", "Jardín",
] as const;
const VALID_DELIVERY = ["retiro", "envio", "ambos"] as const;

const categoryColors: Record<string, string> = {
  "Electrónica":  "#dbeafe", "Ropa":      "#fce7f3", "Hogar":  "#d1fae5",
  "Arte":         "#fef3c7", "Deportes":  "#e0f2fe", "Vehículos": "#f3e8ff",
  "Herramientas": "#fed7aa", "Juguetes":  "#fde68a", "Libros": "#c7d2fe",
  "Mascotas":     "#fecdd3", "Bebés":     "#bae6fd", "Jardín": "#bbf7d0",
};
const categoryDefaultEmoji: Record<string, string> = {
  "Electrónica":  "💻", "Ropa":      "👗", "Hogar":  "🛋️",
  "Arte":         "🎨", "Deportes":  "🚲", "Vehículos": "🚗",
  "Herramientas": "🔧", "Juguetes":  "🧸", "Libros": "📚",
  "Mascotas":     "🐾", "Bebés":     "👶", "Jardín": "🌱",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  idx:          number;
  title:        string;
  priceRaw:     string;
  priceDisplay: string;
  category:     string;
  emoji:        string;
  condition:    "Nuevo" | "Usado";
  description:  string;
  location:     string;       // texto original del Excel
  locationNorm: string;       // nombre normalizado por la API georef
  lat:          number;       // coordenadas resueltas
  lng:          number;
  negotiable:   boolean;
  delivery:     "retiro" | "envio" | "ambos";
  phone:        string;
  stock:        number;
  errors:       string[];
}

// ── Resolución de ubicaciones (API georef Argentina) ──────────────────────────

interface GeoLoc {
  id: string;
  nombre: string;
  provincia: { nombre: string };
  centroide: { lat: number; lon: number };
}

// Alias comunes que los usuarios escriben en el Excel
const PROV_ALIASES: Record<string, string> = {
  "caba":              "ciudad autónoma de buenos aires",
  "capital federal":   "ciudad autónoma de buenos aires",
  "capital":           "ciudad autónoma de buenos aires",
  "cdmx":              "ciudad autónoma de buenos aires",
  "bs as":             "buenos aires",
  "bsas":              "buenos aires",
  "gba":               "buenos aires",
  "pba":               "buenos aires",
};

async function resolveLocation(raw: string): Promise<{
  ok: boolean; normalized: string; lat: number; lng: number;
}> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, normalized: "", lat: 0, lng: 0 };

  const parts   = trimmed.split(",").map(s => s.trim());
  const name    = parts[0];
  const provRaw = (parts[1] ?? "").toLowerCase();
  const prov    = PROV_ALIASES[provRaw] ?? provRaw;

  async function query(nombre: string, provincia?: string): Promise<GeoLoc[]> {
    const params = new URLSearchParams({ nombre, max: "8", campos: "id,nombre,provincia.nombre,centroide" });
    if (provincia) params.set("provincia", provincia);
    try {
      const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json() as { localidades?: GeoLoc[] };
      return json.localidades ?? [];
    } catch {
      return [];
    }
  }

  // 1er intento: con provincia
  let locs = prov ? await query(name, prov) : await query(name);
  // 2do intento: solo por nombre (sin provincia), por si el alias no funcionó
  if (!locs.length && prov) locs = await query(name);

  if (!locs.length) return { ok: false, normalized: trimmed, lat: 0, lng: 0 };

  // Preferir coincidencia exacta de nombre; si no, tomar el primero
  const exact = locs.find(l => l.nombre.toLowerCase() === name.toLowerCase()) ?? locs[0];
  return {
    ok:         true,
    normalized: `${exact.nombre}, ${exact.provincia.nombre}`,
    lat:        exact.centroide.lat,
    lng:        exact.centroide.lon,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(raw: string): string {
  const n = Number(raw.replace(/\D/g, ""));
  return n ? "$" + n.toLocaleString("es-AR") : "";
}

function parseRows(sheet: unknown[][]): ParsedRow[] {
  return sheet
    .slice(1)                              // omitir encabezado
    .filter(r => Array.isArray(r) && r.some(c => String(c ?? "").trim()))
    .map((row, idx) => {
      const col  = (i: number) => String((row as unknown[])[i] ?? "").trim();
      const title       = col(0);
      const price       = col(1).replace(/\D/g, "");
      const category    = col(2);
      const emoji       = col(3);
      const condition   = col(4);
      const description = col(5);
      const location    = col(6);
      const negotiable  = col(7).toLowerCase();
      const delivery    = col(8).toLowerCase();
      const phone       = col(9).replace(/\D/g, "");
      const stock       = parseInt(col(10)) || 1;

      const errors: string[] = [];
      if (!title)                                          errors.push("Título obligatorio");
      if (!price)                                          errors.push("Precio obligatorio");
      else if (isNaN(Number(price)))                       errors.push("Precio inválido (solo números)");
      if (!(VALID_CATEGORIES as readonly string[]).includes(category))
                                                           errors.push(`Categoría inválida — usá: ${VALID_CATEGORIES.join(", ")}`);
      if (condition && !["Nuevo", "Usado"].includes(condition))
                                                           errors.push("Condición debe ser «Nuevo» o «Usado»");
      if (!description)                                    errors.push("Descripción obligatoria");
      if (!location)                                       errors.push("Ubicación obligatoria");

      const validCat = (VALID_CATEGORIES as readonly string[]).includes(category)
        ? category : "";

      return {
        idx,
        title,
        priceRaw:     price,
        priceDisplay: fmtPrice(price),
        category:     validCat,
        emoji:        emoji || categoryDefaultEmoji[validCat] || "📦",
        condition:    condition === "Nuevo" ? "Nuevo" : "Usado",
        description,
        location,
        locationNorm: "",   // se rellena en la validación async
        lat:          0,
        lng:          0,
        negotiable:   ["sí", "si", "yes", "1", "true"].includes(negotiable),
        delivery:     (VALID_DELIVERY as readonly string[]).includes(delivery)
                        ? (delivery as "retiro" | "envio" | "ambos")
                        : "retiro",
        phone,
        stock:        Math.max(1, stock),
        errors,
      };
    });
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ExcelUpload({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [rows,       setRows]      = useState<ParsedRow[]>([]);
  const [step,       setStep]      = useState<"idle" | "preview">("idle");
  const [loading,    setLoading]   = useState(false);
  const [validating, setValidating] = useState(false);
  const [progress,   setProgress]  = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Fotos por fila: clave = row.idx
  const [rowPhotos, setRowPhotos] = useState<Map<number, File[]>>(new Map());

  function updateRowPhotos(idx: number, files: File[]) {
    setRowPhotos(prev => new Map(prev).set(idx, files));
  }

  // ── Descarga de plantilla ──────────────────────────────────
  async function downloadTemplate() {
    const XLSX = await import("xlsx");

    const headers = [
      "Título", "Precio", "Categoría", "Emoji", "Condición",
      "Descripción", "Ubicación", "Negociable", "Entrega",
      "Teléfono/WhatsApp", "Stock",
    ];
    const ex1 = [
      "iPhone 13 128GB libre", "250000", "Electrónica", "📱", "Usado",
      "En perfecto estado con caja y cargador original. Sin rayones.",
      "Palermo, CABA", "No", "retiro", "1123456789", "1",
    ];
    const ex2 = [
      "Zapatillas Nike Air Max talle 42", "80000", "Ropa", "👟", "Nuevo",
      "Nunca usadas, en caja original.",
      "Belgrano, CABA", "Sí", "ambos", "1187654321", "2",
    ];

    const colWidths = [32, 12, 14, 8, 11, 50, 22, 12, 10, 20, 7];
    const ws  = XLSX.utils.aoa_to_sheet([headers, ex1, ex2]);
    ws["!cols"] = colWidths.map(w => ({ wch: w }));

    // Hoja de instrucciones
    const instrRows = [
      ["Campo",              "Valores válidos",                                                                                       "¿Obligatorio?"],
      ["Título",             "Texto libre",                                                                                           "Sí"],
      ["Precio",             "Solo números, sin puntos ni comas  (ej: 150000)",                                                       "Sí"],
      ["Categoría",          "Electrónica | Ropa | Hogar | Arte | Deportes | Vehículos | Herramientas | Juguetes | Libros | Mascotas | Bebés | Jardín", "Sí"],
      ["Emoji",              "Cualquier emoji que represente el producto",            "No (se asigna uno por defecto)"],
      ["Condición",          "Nuevo | Usado",                                         "No (default: Usado)"],
      ["Descripción",        "Texto libre, máx. 800 caracteres",                     "Sí"],
      ["Ubicación",          "Ciudad o barrio + Provincia  (ej: Rosario, Santa Fe  /  Palermo, CABA  /  Córdoba, Córdoba)", "Sí"],
      ["Negociable",         "Sí | No",                                              "No (default: No)"],
      ["Entrega",            "retiro | envio | ambos",                               "No (default: retiro)"],
      ["Teléfono/WhatsApp",  "Solo números, sin espacios ni guiones (ej: 1123456789)", "No"],
      ["Stock",              "Número entero (ej: 1)",                                "No (default: 1)"],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instrRows);
    wsI["!cols"] = [{ wch: 22 }, { wch: 58 }, { wch: 28 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,  "Productos");
    XLSX.utils.book_append_sheet(wb, wsI, "Instrucciones");
    XLSX.writeFile(wb, "plantilla_EstamosCerca.xlsx");
  }

  // ── Lectura del archivo ────────────────────────────────────
  async function handleFile(file: File) {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      const parsed = parseRows(data);

      if (parsed.length === 0) {
        toast("El archivo no tiene filas con datos.", "error");
        setLoading(false);
        return;
      }

      // Validar ubicaciones contra la API georef de Argentina
      setLoading(false);
      setValidating(true);
      const withLocations = await Promise.all(
        parsed.map(async row => {
          // Si ya tiene error de ubicación vacía, no consultar la API
          if (!row.location) return row;
          const geo = await resolveLocation(row.location);
          const errors = row.errors.filter(e => !e.startsWith("Ubicación"));
          if (!geo.ok) {
            errors.push(`Ubicación no encontrada — escribí "Ciudad, Provincia" (ej: "Rosario, Santa Fe")`);
          }
          return { ...row, locationNorm: geo.normalized, lat: geo.lat, lng: geo.lng, errors };
        })
      );
      setValidating(false);
      setRows(withLocations);
      setStep("preview");
    } catch {
      toast("No se pudo leer el archivo. Usá la plantilla original.", "error");
      setLoading(false);
      setValidating(false);
    }
  }

  // ── Publicación masiva ─────────────────────────────────────
  async function handleSubmitAll() {
    const valid = rows.filter(r => r.errors.length === 0);
    if (!valid.length) {
      toast("No hay productos válidos para publicar.", "error");
      return;
    }

    setSubmitting(true);
    setProgress(0);
    let ok = 0;

    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      try {
        // Subir fotos si las hay
        const files = rowPhotos.get(p.idx) ?? [];
        let imageUrls: string[] = [];
        if (files.length > 0) {
          imageUrls = await uploadProductImages(userId, files);
        }

        await saveLocalProduct({
          title:       p.title,
          price:       p.priceDisplay,
          category:    p.category,
          emoji:       p.emoji,
          description: p.description,
          location:    p.locationNorm || p.location,
          lat:         p.lat || undefined,
          lng:         p.lng || undefined,
          condition:   p.condition,
          images:      imageUrls,
          distance:    "Cerca tuyo",
          bg:          categoryColors[p.category] ?? "#f5f5f3",
          verified:    false,
          userId,
          negotiable:  p.negotiable,
          delivery:    p.delivery,
          phone:       p.phone || undefined,
          stock:       p.stock,
        });
        ok++;
      } catch { /* continuar con el resto */ }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    setSubmitting(false);
    toast(`¡${ok} producto${ok !== 1 ? "s" : ""} publicado${ok !== 1 ? "s" : ""}! 🎉`);
    onDone();
  }

  // ── Render ─────────────────────────────────────────────────

  if (step === "idle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Paso 1 — Plantilla */}
        <StepCard n={1} title="Descargá la plantilla">
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "8px 0 14px", lineHeight: 1.6 }}>
            El archivo incluye las columnas necesarias y dos filas de ejemplo para guiarte.
            Abrí la hoja <strong>Instrucciones</strong> para ver los valores válidos.
          </p>
          <button
            onClick={downloadTemplate}
            style={outlineBtn}
          >
            <DownloadIcon /> Descargar plantilla .xlsx
          </button>
        </StepCard>

        {/* Paso 2 — Completar */}
        <StepCard n={2} title="Completá la plantilla">
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              "Una fila = un producto",
              "Respetá el formato de cada columna (ver hoja «Instrucciones»)",
              "Dejá en blanco los campos opcionales si no los necesitás",
              "Las fotos se pueden agregar después desde «Mis publicaciones»",
              "Guardá el archivo como .xlsx o .xls antes de subirlo",
            ].map(tip => (
              <li key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>·</span>
                {tip}
              </li>
            ))}
          </ul>
        </StepCard>

        {/* Paso 3 — Subir */}
        <StepCard n={3} title="Subí el archivo completado">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading || validating}
            style={{
              marginTop: 12, width: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "30px 20px",
              border: "2px dashed var(--border)", borderRadius: 8,
              background: "var(--bg)", cursor: loading ? "default" : "pointer",
              color: "var(--text-3)", opacity: loading ? 0.6 : 1,
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              if (loading) return;
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
            }}
          >
            {loading || validating ? (
              <span style={{ fontSize: 13 }}>
                {validating ? "Validando ubicaciones..." : "Procesando archivo..."}
              </span>
            ) : (
              <>
                <UploadIcon />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Seleccionar archivo .xlsx</span>
                <span style={{ fontSize: 11 }}>o arrastrá y soltá acá</span>
              </>
            )}
          </button>
        </StepCard>

      </div>
    );
  }

  // ── Vista previa ───────────────────────────────────────────
  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header de preview */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
            Vista previa — {rows.length} producto{rows.length !== 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{validRows.length} OK</span>
            {errorRows.length > 0 && (
              <span style={{ color: "#ef4444", marginLeft: 10, fontWeight: 600 }}>
                {errorRows.length} con errores — se omitirán al publicar
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => { setRows([]); setStep("idle"); setRowPhotos(new Map()); }}
          style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
        >
          ← Cambiar archivo
        </button>
      </div>

      {/* Barra de progreso (solo mientras publica) */}
      {submitting && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <span>Publicando productos...</span>
            <span style={{ color: "var(--green)" }}>{progress}%</span>
          </div>
          <div style={{ background: "var(--border)", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "var(--green)", borderRadius: 999,
              width: `${progress}%`, transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {/* Cards de productos */}
      {rows.map(row => (
        <ProductPreviewCard
          key={row.idx}
          row={row}
          photos={rowPhotos.get(row.idx) ?? []}
          onPhotosChange={files => updateRowPhotos(row.idx, files)}
          onRemove={() => setRows(r => r.filter(x => x.idx !== row.idx))}
        />
      ))}

      {/* Botón publicar */}
      {!submitting && validRows.length > 0 && (
        <button
          onClick={handleSubmitAll}
          style={{
            marginTop: 4,
            background: "var(--green)", color: "#fff",
            border: "none", borderRadius: 6,
            padding: "12px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", letterSpacing: -0.1,
          }}
        >
          Publicar {validRows.length} producto{validRows.length !== 1 ? "s" : ""} →
        </button>
      )}

    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "1.1rem 1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "var(--green)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>{n}</div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ProductPreviewCard({
  row,
  photos,
  onPhotosChange,
  onRemove,
}: {
  row: ParsedRow;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  onRemove: () => void;
}) {
  const hasError = row.errors.length > 0;
  const deliveryLabel: Record<string, string> = { retiro: "🤝 Retiro", envio: "📦 Envío", ambos: "✅ Ambos" };
  const fileRef = useRef<HTMLInputElement>(null);

  // Previews de las fotos de esta fila
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [photos]);

  function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    onPhotosChange([...photos, ...selected.slice(0, remaining)]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(i: number) {
    onPhotosChange(photos.filter((_, j) => j !== i));
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${hasError ? "#fca5a5" : "var(--border)"}`,
      borderRadius: 8, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

        {/* Ícono */}
        <div style={{
          width: 46, height: 46, borderRadius: 8, flexShrink: 0,
          background: categoryColors[row.category] ?? "#f5f5f3",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>
          {row.emoji}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Título */}
              <div style={{
                fontSize: 13, fontWeight: 600, marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: hasError ? "var(--text-3)" : "var(--text)",
              }}>
                {row.title || <span style={{ fontStyle: "italic", fontWeight: 400 }}>Sin título</span>}
              </div>

              {!hasError && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>
                    {row.priceDisplay}
                  </span>
                  {row.negotiable && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: "var(--green)",
                      background: "var(--green-subtle)", borderRadius: 4, padding: "2px 6px",
                    }}>
                      Negociable
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {row.condition} · {row.category}
                  </span>
                  <span style={{ fontSize: 11, color: row.locationNorm ? "var(--green)" : "var(--text-3)" }}>
                    📍 {row.locationNorm || row.location}
                    {row.locationNorm && row.locationNorm !== row.location && (
                      <span style={{ opacity: 0.6 }}> ✓</span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{deliveryLabel[row.delivery]}</span>
                  {row.stock > 1 && (
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Stock: {row.stock}</span>
                  )}
                </div>
              )}

              {/* Errores */}
              {hasError && (
                <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 3 }}>
                  {row.errors.map(err => (
                    <div key={err} style={{ fontSize: 11, color: "#dc2626", display: "flex", gap: 5 }}>
                      <span style={{ flexShrink: 0 }}>·</span> {err}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Badge + botón eliminar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {hasError ? (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#dc2626",
                  background: "#fee2e2", borderRadius: 4, padding: "3px 7px",
                }}>⚠ Error</span>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#16a34a",
                  background: "#dcfce7", borderRadius: 4, padding: "3px 7px",
                }}>✓ OK</span>
              )}
              <button
                onClick={onRemove}
                title="Quitar"
                style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-3)", fontSize: 14, flexShrink: 0,
                }}
              >×</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zona de fotos ── */}
      {!hasError && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleAddPhotos}
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {/* Miniaturas */}
            {previews.map((src, i) => (
              <div
                key={src}
                style={{
                  position: "relative", width: 48, height: 48,
                  borderRadius: 6, overflow: "hidden", flexShrink: 0,
                  border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {i === 0 && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "rgba(0,0,0,0.45)", fontSize: 7,
                    color: "#fff", textAlign: "center", padding: "1px 0",
                    fontWeight: 700, letterSpacing: 0.3,
                  }}>
                    PRINCIPAL
                  </div>
                )}
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position: "absolute", top: 2, right: 2,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "none",
                    color: "#fff", fontSize: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, lineHeight: 1,
                  }}
                >×</button>
              </div>
            ))}

            {/* Botón agregar */}
            {photos.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 48, height: 48, borderRadius: 6, flexShrink: 0,
                  border: "1.5px dashed var(--border)", background: "var(--bg)",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                  color: "var(--text-3)", transition: "border-color 0.12s, color 0.12s",
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 8, fontWeight: 600 }}>
                  {photos.length === 0 ? "Fotos" : "+"}
                </span>
              </button>
            )}

            {/* Contador */}
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 2 }}>
              {photos.length === 0
                ? "Sin fotos — opcional"
                : `${photos.length}/5 foto${photos.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Íconos ────────────────────────────────────────────────────────────────────

const outlineBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "9px 16px", borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--bg)",
  fontSize: 13, fontWeight: 600, color: "var(--text)", cursor: "pointer",
};

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  );
}
