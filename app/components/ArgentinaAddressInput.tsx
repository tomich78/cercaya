"use client";
import { useEffect, useRef, useState } from "react";

// ── Provincias ────────────────────────────────────────────────

export const PROVINCIAS = [
  { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
  { id: "06", nombre: "Buenos Aires" },
  { id: "10", nombre: "Catamarca" },
  { id: "14", nombre: "Córdoba" },
  { id: "18", nombre: "Corrientes" },
  { id: "22", nombre: "Chaco" },
  { id: "26", nombre: "Chubut" },
  { id: "30", nombre: "Entre Ríos" },
  { id: "34", nombre: "Formosa" },
  { id: "38", nombre: "Jujuy" },
  { id: "42", nombre: "La Pampa" },
  { id: "46", nombre: "La Rioja" },
  { id: "50", nombre: "Mendoza" },
  { id: "54", nombre: "Misiones" },
  { id: "58", nombre: "Neuquén" },
  { id: "62", nombre: "Río Negro" },
  { id: "66", nombre: "Salta" },
  { id: "70", nombre: "San Juan" },
  { id: "74", nombre: "San Luis" },
  { id: "78", nombre: "Santa Cruz" },
  { id: "82", nombre: "Santa Fe" },
  { id: "86", nombre: "Santiago del Estero" },
  { id: "90", nombre: "Tucumán" },
  { id: "94", nombre: "Tierra del Fuego" },
];

type Localidad = { id: string; nombre: string };

const fieldStyle = (hasError = false): React.CSSProperties => ({
  width: "100%",
  padding: "9px 11px",
  border: `1px solid ${hasError ? "#dc2626" : "var(--border)"}`,
  borderRadius: 7,
  fontSize: 13,
  color: "var(--text)",
  background: "var(--bg)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.12s",
});

interface ArgentinaAddressInputProps {
  /** Valor inicial (para pre-rellenar al editar). Formato: "Calle 123, Ciudad, Provincia" */
  initialValue?: string;
  /** Se llama con la dirección completa compuesta cada vez que cambia */
  onChange: (value: string) => void;
  error?: string;
  onClearError?: () => void;
}

/**
 * Input de dirección argentina estructurado en 3 pasos:
 * 1. Provincia (dropdown local)
 * 2. Ciudad / localidad (Georef API — cobertura completa de Argentina)
 * 3. Calle y número (texto libre)
 */
export default function ArgentinaAddressInput({
  initialValue,
  onChange,
  error,
  onClearError,
}: ArgentinaAddressInputProps) {
  const [provId,    setProvId]    = useState("");
  const [cityInput, setCityInput] = useState("");
  const [street,    setStreet]    = useState("");
  const [locs,      setLocs]      = useState<Localidad[]>([]);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [fetching,  setFetching]  = useState(false);
  const cityWrapRef = useRef<HTMLDivElement>(null);

  // Pre-rellenar desde initialValue al montar (solo una vez)
  useEffect(() => {
    if (!initialValue) return;
    const parts = initialValue.split(",").map(s => s.trim());
    // Formato esperado: "Calle 123, Ciudad, Provincia"
    if (parts.length >= 3) {
      setStreet(parts.slice(0, parts.length - 2).join(", "));
      setCityInput(parts[parts.length - 2]);
      const prov = PROVINCIAS.find(p => p.nombre.toLowerCase() === parts[parts.length - 1].toLowerCase());
      if (prov) setProvId(prov.id);
    } else if (parts.length === 2) {
      setStreet(parts[0]);
      setCityInput(parts[1]);
    } else {
      setStreet(initialValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provName = PROVINCIAS.find(p => p.id === provId)?.nombre ?? "";

  // Notificar al padre cada vez que cambia algún campo
  useEffect(() => {
    const parts = [street.trim(), cityInput.trim(), provName].filter(Boolean);
    onChange(parts.length >= 2 ? parts.join(", ") : "");
  }, [street, cityInput, provName, onChange]);

  // Buscar localidades via Georef
  useEffect(() => {
    if (cityInput.length < 2) { setLocs([]); setDropOpen(false); return; }
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const qs = `nombre=${encodeURIComponent(cityInput)}&max=8${provId ? `&provincia=${provId}` : ""}`;
        const r  = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${qs}`);
        const d  = await r.json() as { localidades?: Localidad[] };
        const list = d.localidades ?? [];
        setLocs(list);
        setDropOpen(list.length > 0);
      } catch { setLocs([]); }
      setFetching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [cityInput, provId]);

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node))
        setDropOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hasError = !!error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Paso 1: Provincia */}
      <select
        value={provId}
        onChange={e => {
          setProvId(e.target.value);
          setCityInput("");
          setLocs([]);
          onClearError?.();
        }}
        style={{ ...fieldStyle(hasError && !provId), cursor: "pointer" }}
      >
        <option value="">Provincia…</option>
        {PROVINCIAS.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      {/* Paso 2: Ciudad / localidad */}
      <div ref={cityWrapRef} style={{ position: "relative" }}>
        <div style={{ position: "relative" }}>
          <input
            value={cityInput}
            onChange={e => { setCityInput(e.target.value); setDropOpen(false); onClearError?.(); }}
            onFocus={() => { if (locs.length > 0) setDropOpen(true); }}
            placeholder={provId ? "Ciudad o localidad…" : "Primero elegí una provincia"}
            disabled={!provId}
            autoComplete="off"
            style={{
              ...fieldStyle(hasError && !!provId && !cityInput),
              paddingRight: fetching ? 30 : 11,
              opacity: provId ? 1 : 0.5,
              borderRadius: dropOpen && locs.length > 0 ? "7px 7px 0 0" : 7,
            }}
          />
          {fetching && (
            <div style={{
              position: "absolute", right: 10, top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12, color: "var(--text-3)", pointerEvents: "none",
            }}>
              ⟳
            </div>
          )}
        </div>

        {dropOpen && locs.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0, zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)", borderTop: "none",
            borderRadius: "0 0 7px 7px",
            maxHeight: 200, overflowY: "auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
          }}>
            {locs.map((loc, i) => (
              <button
                key={loc.id}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  setCityInput(loc.nombre);
                  setDropOpen(false);
                  onClearError?.();
                }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", background: "none", border: "none",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  fontSize: 12, color: "var(--text)", cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {loc.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paso 3: Calle y número */}
      <input
        value={street}
        onChange={e => { setStreet(e.target.value); onClearError?.(); }}
        placeholder={cityInput ? "Calle y número, piso/depto (opcional)" : "Primero elegí tu ciudad"}
        disabled={!cityInput}
        style={{ ...fieldStyle(hasError && !!cityInput && !street), opacity: cityInput ? 1 : 0.5 }}
      />

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
