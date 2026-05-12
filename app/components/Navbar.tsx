"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, type LocalUser } from "../lib/auth";
import { getUnreadCount } from "../lib/messages";
import { supabase } from "../lib/supabase";
import { useTheme } from "./ThemeProvider";

export default function Navbar() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser]     = useState<LocalUser | null>(null);
  const [open, setOpen]     = useState(false);
  const [unread, setUnread] = useState(0);
  const dropdownRef         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u);
      if (u) getUnreadCount(u.id).then(setUnread);
    });

    // Reactivo al estado de auth de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getCurrentUser().then(u => {
        setUser(u);
        if (u) getUnreadCount(u.id).then(setUnread);
        else   setUnread(0);
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Polling cada 5s para detectar mensajes nuevos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      getUnreadCount(user.id).then(setUnread);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setUnread(0);
    setOpen(false);
    router.push("/");
  }

  return (
    <>
    <nav style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "0 1.5rem",
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.5, color: "var(--text)" }}>
        estamos<span style={{ color: "var(--green)" }}>cerca</span>
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user && (
          <Link href="/guardados" className="hide-mobile" style={{
            fontSize: 13, fontWeight: 500,
            color: "var(--text-2)",
            padding: "6px 4px",
          }}>
            Guardados
          </Link>
        )}
        {user && (
          <Link href="/mensajes" className="hide-mobile" style={{
            fontSize: 13, fontWeight: 500,
            color: "var(--text-2)",
            padding: "6px 4px",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            Mensajes
            {unread > 0 && (
              <span style={{
                background: "#ef4444", color: "#fff",
                borderRadius: "50%",
                width: 16, height: 16,
                fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        )}

        {/* Toggle modo oscuro */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{
            width: 32, height: 32,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-2)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
        >
          {theme === "dark" ? (
            /* Sol */
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Luna */
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <Link href={user ? "/publicar" : "/login?redirect=/publicar"} style={{
          background: "var(--green)",
          color: "#fff",
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: -0.1,
          display: "inline-block",
        }}>
          + Publicar
        </Link>

        {user ? (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              onClick={() => setOpen(o => !o)}
              style={{
                width: 30, height: 30,
                borderRadius: "50%",
                background: "var(--green-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, color: "var(--green)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {user.initials}
            </div>

            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 0",
                minWidth: 180,
                boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                zIndex: 200,
              }}>
                <div style={{
                  padding: "8px 14px 10px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{user.email}</div>
                </div>
                <Link
                  href="/perfil"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "7px 14px",
                    fontSize: 13, color: "var(--text-2)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "transparent")}
                >
                  Mi perfil
                </Link>
                <Link
                  href="/guardados"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "7px 14px",
                    fontSize: 13, color: "var(--text-2)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "transparent")}
                >
                  Mis guardados
                </Link>
                <Link
                  href="/alertas"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "7px 14px",
                    fontSize: 13, color: "var(--text-2)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "transparent")}
                >
                  🔔 Alertas
                </Link>
                <Link
                  href="/mensajes"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 14px",
                    fontSize: 13, color: "var(--text-2)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "transparent")}
                >
                  Mensajes
                  {unread > 0 && (
                    <span style={{
                      background: "#ef4444", color: "#fff",
                      borderRadius: "50%",
                      width: 16, height: 16,
                      fontSize: 10, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "7px 14px",
                    background: "none", border: "none",
                    fontSize: 13, color: "var(--text-2)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-2)",
            padding: "6px 10px",
          }}>
            Entrar
          </Link>
        )}
      </div>
    </nav>

    {/* ── Bottom nav mobile ─────────────────────────────────────── */}
    <nav className="mobile-bottom-nav" style={{
      display: "none", // CSS lo muestra en mobile
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      height: 60,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      zIndex: 100,
      alignItems: "center",
      justifyContent: "space-around",
      padding: "0 4px",
    }}>
      {/* Inicio */}
      <Link href="/" style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: "var(--text-2)", fontSize: 10, fontWeight: 500, padding: "6px 12px",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Inicio
      </Link>

      {/* Mensajes */}
      <Link href={user ? "/mensajes" : "/login?redirect=/mensajes"} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: "var(--text-2)", fontSize: 10, fontWeight: 500, padding: "6px 12px",
        position: "relative",
      }}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -6,
              background: "#ef4444", color: "#fff",
              borderRadius: "50%",
              width: 15, height: 15,
              fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        Mensajes
      </Link>

      {/* Publicar */}
      <Link href={user ? "/publicar" : "/login?redirect=/publicar"} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "6px 12px",
      }}>
        <span style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "var(--green)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: -18,
          boxShadow: "0 2px 10px rgba(15,110,86,0.35)",
          border: "3px solid var(--surface)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
      </Link>

      {/* Guardados */}
      <Link href={user ? "/guardados" : "/login?redirect=/guardados"} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: "var(--text-2)", fontSize: 10, fontWeight: 500, padding: "6px 12px",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        Guardados
      </Link>

      {/* Perfil */}
      <Link href={user ? "/perfil" : "/login"} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: "var(--text-2)", fontSize: 10, fontWeight: 500, padding: "6px 12px",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Perfil
      </Link>
    </nav>
    </>
  );
}
