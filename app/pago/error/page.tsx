"use client";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function PagoErrorPage() {
  return (
    <div>
      <Navbar />
      <div style={{
        maxWidth: 480, margin: "0 auto", padding: "4rem 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 12px" }}>
          El pago no se completó
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 32px" }}>
          Hubo un problema al procesar tu pago. No se realizó ningún cobro.
          <br />Podés intentarlo de nuevo cuando quieras.
        </p>
        <Link href="/" style={{
          background: "var(--green)", color: "#fff",
          borderRadius: 6, padding: "10px 24px",
          fontSize: 13, fontWeight: 600,
        }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
