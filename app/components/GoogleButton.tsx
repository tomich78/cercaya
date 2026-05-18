"use client";
import { useState } from "react";
import { loginWithGoogle } from "../lib/auth";

export default function GoogleButton({ redirect = "/" }: { redirect?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await loginWithGoogle(redirect);
    // La página redirige sola, no hace falta setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px",
        background: "#fff",
        border: "1px solid #dadce0",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        color: "#3c4043",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        fontFamily: "inherit",
        transition: "box-shadow 0.15s",
      }}
    >
      {!loading && (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04c-.72.48-1.63.77-2.7.77-2.09 0-3.85-1.41-4.49-3.3H1.8v2.07A8 8 0 0 0 8.98 17z"/>
          <path fill="#FBBC05" d="M4.49 10.49c-.16-.48-.25-.99-.25-1.49s.09-1 .25-1.49V5.44H1.8A8 8 0 0 0 .98 9c0 1.29.31 2.51.82 3.56l2.69-2.07z"/>
          <path fill="#EA4335" d="M8.98 3.72c1.18 0 2.23.41 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.18 4.44l2.69 2.07c.63-1.89 2.4-3.3 4.49-3.3z"/>
        </svg>
      )}
      {loading ? "Redirigiendo..." : "Continuar con Google"}
    </button>
  );
}
