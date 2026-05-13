"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

const MENSAJES: Record<string, { titulo: string; desc: string; link: string; linkLabel: string }> = {
  destacar_7:  { titulo: "¡Publicación destacada!", desc: "Tu producto aparecerá primero en el feed durante 7 días.", link: "/", linkLabel: "Ver mi publicación" },
  destacar_30: { titulo: "¡Publicación destacada!", desc: "Tu producto aparecerá primero en el feed durante 30 días.", link: "/", linkLabel: "Ver mi publicación" },
  negocio_mes: { titulo: "¡Modo Negocio activado!", desc: "Tu cuenta ahora tiene perfil de negocio por 1 mes.", link: "/perfil", linkLabel: "Ver mi perfil" },
  banner_7:    { titulo: "¡Banner activado!", desc: "Tu banner se mostrará en el sitio durante 7 días.", link: "/perfil", linkLabel: "Ver mi perfil" },
};

function ExitoContent() {
  const params = useSearchParams();
  const tipo   = params.get("tipo") ?? "";
  const msg    = MENSAJES[tipo] ?? { titulo: "¡Pago aprobado!", desc: "Tu pago fue procesado correctamente.", link: "/", linkLabel: "Ir al inicio" };

  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 12px" }}>
        {msg.titulo}
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 32px" }}>
        {msg.desc}
        <br />
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Los cambios pueden tardar unos segundos en verse reflejados{dots}
        </span>
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href={msg.link} style={{
          background: "var(--green)", color: "#fff",
          borderRadius: 6, padding: "10px 24px",
          fontSize: 13, fontWeight: 600,
        }}>
          {msg.linkLabel}
        </Link>
        <Link href="/" style={{
          background: "var(--surface)", color: "var(--text-2)",
          border: "1px solid var(--border)",
          borderRadius: 6, padding: "10px 24px",
          fontSize: 13, fontWeight: 500,
        }}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

export default function PagoExitoPage() {
  return (
    <div>
      <Navbar />
      <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)" }}>Cargando...</div>}>
        <ExitoContent />
      </Suspense>
    </div>
  );
}
