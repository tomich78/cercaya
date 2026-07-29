"use client";
import { useState } from "react";
import { useToast } from "./ToastProvider";

type Variant = "primary" | "secondary" | "icon";

interface ShareButtonProps {
  /** Ruta relativa o absoluta a compartir. Ej: `/negocio/mi-slug` */
  url: string;
  /** Título del contenido compartido (aparece en el menú nativo) */
  title: string;
  /** Texto opcional que acompaña al link en el menú nativo */
  text?: string;
  variant?: Variant;
  /** Etiqueta del botón (no aplica a variant="icon") */
  label?: string;
}

export default function ShareButton({
  url,
  title,
  text,
  variant = "secondary",
  label = "Compartir",
}: ShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Construir URL absoluta si nos pasaron una ruta relativa
    const absoluteUrl = url.startsWith("http")
      ? url
      : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;

    // 1. Web Share API (celular → menú nativo)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch {
        // Usuario canceló el menú → no hacemos nada
        return;
      }
    }

    // 2. Fallback desktop → copiar al portapapeles
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast("Link copiado al portapapeles", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("No se pudo copiar el link", "error");
    }
  }

  const shareIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        title={label}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "1px solid var(--border)", background: "var(--surface)",
          color: "var(--text-2)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.color = "var(--green)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
      >
        {copied ? "✓" : shareIcon}
      </button>
    );
  }

  const isPrimary = variant === "primary";
  return (
    <button
      onClick={handleShare}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        borderRadius: 7, padding: "9px 18px",
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: isPrimary ? "none" : "1px solid var(--border)",
        background: isPrimary ? "var(--green)" : "var(--surface)",
        color: isPrimary ? "#fff" : "var(--text-2)",
        transition: "border-color 0.12s, color 0.12s",
      }}
      onMouseEnter={e => { if (!isPrimary) { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.color = "var(--green)"; } }}
      onMouseLeave={e => { if (!isPrimary) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; } }}
    >
      {copied ? "✓ Copiado" : <>{shareIcon}{label}</>}
    </button>
  );
}
