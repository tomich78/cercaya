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
        cerca<span style={{ color: "var(--green)" }}>ya</span>
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
  );
}
