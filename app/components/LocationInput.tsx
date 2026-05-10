"use client";
import { useState, useEffect, useRef } from "react";

interface Suggestion {
  id: string;
  label: string;   // "Nombre, Provincia"
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (name: string, lat: number, lng: number) => void;
  onClear?: () => void;
  placeholder?: string;
  hasError?: boolean;
}

export default function LocationInput({
  value,
  onChange,
  onClear,
  placeholder = "Ej: Capital, Santiago del Estero",
  hasError = false,
}: Props) {
  const [query,       setQuery]       = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [confirmed,   setConfirmed]   = useState(false); // se eligió de la lista
  const containerRef  = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar query si cambia value desde afuera
  useEffect(() => {
    setQuery(value);
    setConfirmed(!!value);
  }, [value]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setConfirmed(false);
    if (onClear) onClear();

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://apis.datos.gob.ar/georef/api/localidades?nombre=${encodeURIComponent(q.trim())}&max=8&campos=id,nombre,provincia.nombre,centroide`;
        const res  = await fetch(url);
        const json = await res.json();

        const items: Suggestion[] = (json.localidades ?? []).map(
          (loc: { id: string; nombre: string; provincia: { nombre: string }; centroide: { lat: number; lon: number } }) => ({
            id:    loc.id,
            label: `${loc.nombre}, ${loc.provincia.nombre}`,
            lat:   loc.centroide.lat,
            lng:   loc.centroide.lon,
          })
        );

        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.label);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onChange(s.label, s.lat, s.lng);
  }

  function handleClear() {
    setQuery("");
    setConfirmed(false);
    setSuggestions([]);
    setOpen(false);
    if (onClear) onClear();
  }

  const border = hasError
    ? "1px solid #dc2626"
    : confirmed
      ? "1px solid var(--green)"
      : "1px solid var(--border)";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center",
        border, borderRadius: 6,
        background: "var(--bg)",
        transition: "border-color 0.15s",
      }}>
        {/* Pin icon */}
        <div style={{ paddingLeft: 10, display: "flex", alignItems: "center", color: confirmed ? "var(--green)" : "var(--text-3)", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            flex: 1,
            padding: "8px 8px 8px 7px",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "var(--text)",
            background: "transparent",
            fontFamily: "inherit",
          }}
        />

        {/* Spinner / limpiar */}
        {loading ? (
          <div style={{ paddingRight: 10, color: "var(--text-3)", fontSize: 11 }}>...</div>
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              paddingRight: 10, background: "none", border: "none",
              cursor: "pointer", color: "var(--text-3)", fontSize: 16,
              display: "flex", alignItems: "center", lineHeight: 1,
            }}
          >×</button>
        ) : null}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          zIndex: 100, overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => handleSelect(s)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "9px 12px",
                background: "none", border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer", textAlign: "left",
                fontSize: 13, color: "var(--text)",
                transition: "background 0.08s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hint: no confirmado aún */}
      {query.length >= 2 && !confirmed && !loading && !open && (
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
          Elegí una opción de la lista para guardar la ubicación.
        </div>
      )}
    </div>
  );
}
