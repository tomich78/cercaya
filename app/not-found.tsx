import Link from "next/link";
import Navbar from "./components/Navbar";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Navbar />

      <main style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "4rem 1.5rem",
      }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>

          {/* Número grande */}
          <div style={{
            fontSize: 96, fontWeight: 800, letterSpacing: -6,
            lineHeight: 1, color: "var(--border)",
            marginBottom: 12, userSelect: "none",
          }}>
            404
          </div>

          <h1 style={{
            fontSize: 20, fontWeight: 700, letterSpacing: -0.5,
            margin: "0 0 10px",
          }}>
            Página no encontrada
          </h1>

          <p style={{
            fontSize: 14, color: "var(--text-2)", lineHeight: 1.7,
            margin: "0 0 28px",
          }}>
            La página que buscás no existe o fue movida.
            Podés volver al inicio y seguir explorando.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              background: "var(--green)", color: "#fff",
              borderRadius: 6, padding: "9px 20px",
              fontSize: 13, fontWeight: 600,
              display: "inline-block",
            }}>
              Volver al inicio
            </Link>
            <Link href="/publicar" style={{
              background: "var(--surface)", color: "var(--text-2)",
              border: "1px solid var(--border)",
              borderRadius: 6, padding: "9px 20px",
              fontSize: 13, fontWeight: 500,
              display: "inline-block",
            }}>
              Publicar algo
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
