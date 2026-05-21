"use client";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      background: "var(--surface)",
      padding: "2rem 1.5rem 1.5rem",
      marginTop: "auto",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Fila superior ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "2rem",
          justifyContent: "space-between", marginBottom: "1.75rem",
        }}>

          {/* Marca */}
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
              estamos<span style={{ color: "var(--green)" }}>cerca</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, maxWidth: 200 }}>
              La app de compra-venta local de Argentina.
            </div>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Plataforma
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FooterLink href="/">Explorar</FooterLink>
                <FooterLink href="/publicar">Publicar</FooterLink>
                <FooterLink href="/mensajes">Mensajes</FooterLink>
                <FooterLink href="/perfil">Mi perfil</FooterLink>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Empresa
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FooterLink href="/nosotros">Nosotros</FooterLink>
                <FooterLink href="/ayuda">Ayuda</FooterLink>
                <FooterLink href="mailto:hola@EstamosCerca.com.ar">Contacto</FooterLink>
                <FooterLink href="/anunciar">Publicidad</FooterLink>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Legal
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FooterLink href="/terminos">Términos de uso</FooterLink>
                <FooterLink href="/privacidad">Privacidad</FooterLink>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fila inferior ── */}
        <div style={{
          borderTop: "1px solid var(--border)", paddingTop: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: 12,
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            © {year} EstamosCerca. Hecho en Argentina 🇦🇷
          </div>

          {/* Redes sociales */}
          <div style={{ display: "flex", gap: 10 }}>
            <SocialLink href="https://instagram.com/estamosCerca" label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://twitter.com/estamosCerca" label="Twitter / X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("http");
  if (isExternal) {
    return (
      <a
        href={href}
        style={{ fontSize: 13, color: "var(--text-2)", transition: "color 0.1s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      style={{ fontSize: 13, color: "var(--text-2)", transition: "color 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
    >
      {children}
    </Link>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-3)", transition: "color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--text-3)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {children}
    </a>
  );
}
