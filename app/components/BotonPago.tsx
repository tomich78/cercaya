"use client";
import { useState } from "react";
import type { TipoPago } from "../lib/pagos";
import { supabase } from "../lib/supabase";

interface Props {
  tipo: TipoPago;
  userId: string;
  productId?: number;
  label: string;
  descripcion?: string;
  precio: number;
  style?: React.CSSProperties;
}

export default function BotonPago({ tipo, userId, productId, label, descripcion, precio, style }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handlePagar() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pagos/preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ tipo, userId, productId }),
      });
      const data = await res.json();
      if (!res.ok || !data.initPoint) throw new Error(data.error ?? "Error");
      window.location.href = data.initPoint;
    } catch {
      setError("No se pudo iniciar el pago. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handlePagar}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "12px 14px",
          background: loading ? "var(--border)" : "var(--green)",
          color: "#fff", border: "none", borderRadius: 8,
          cursor: loading ? "default" : "pointer",
          transition: "background 0.15s",
          ...style,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{loading ? "Redirigiendo a Mercado Pago..." : label}</div>
          {descripcion && !loading && (
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{descripcion}</div>
          )}
        </div>
        {!loading && (
          <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>
            ${precio.toLocaleString("es-AR")}
          </div>
        )}
      </button>
      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
