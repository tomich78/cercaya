"use client";
import { useEffect, useState } from "react";

// Extiende BeforeInstallPromptEvent que no está en los tipos estándar
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | null;

const DISMISSED_KEY = "pwa-install-dismissed";
// No volver a mostrar el banner por 7 días tras cerrarlo
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    const diff = Date.now() - parseInt(ts);
    return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function saveDismissed() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* */ }
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // Ya está instalada como PWA — no mostrar el banner
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  // iOS: iPhone/iPad con Safari (no Chrome)
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isIOSSafari = isIOS && !/crios|fxios|opios/i.test(ua);
  if (isIOSSafari) return "ios";
  // Android con Chrome
  const isAndroid = /android/i.test(ua);
  if (isAndroid) return "android";
  return null;
}

export default function InstallBanner() {
  const [platform, setPlatform]   = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint]       = useState(false);
  const [visible, setVisible]               = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;

    const p = detectPlatform();
    if (!p) return;

    if (p === "android") {
      // Android: esperar el evento del browser
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setPlatform("android");
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (p === "ios") {
      setPlatform("ios");
      setVisible(true);
    }
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    setShowIosHint(false);
    saveDismissed();
  }

  if (!visible) return null;

  return (
    <>
      {/* Fondo semitransparente cuando se muestran las instrucciones iOS */}
      {showIosHint && (
        <div
          onClick={() => setShowIosHint(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 998,
          }}
        />
      )}

      {/* Banner principal — aparece arriba en desktop, abajo en mobile */}
      <div style={{
        position: "fixed",
        bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 2rem)",
        maxWidth: 420,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        padding: "14px 16px",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        animation: "banner-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <style>{`
          @keyframes banner-up {
            from { opacity: 0; transform: translateX(-50%) translateY(16px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>

        {/* Ícono de la app */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt="EstamosCerca"
          style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
        />

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 1 }}>
            Instalá EstamosCerca
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>
            Accedé rápido desde tu pantalla de inicio, sin abrir el browser.
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {platform === "android" ? (
            <button
              onClick={handleInstall}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--green)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Instalar
            </button>
          ) : (
            <button
              onClick={() => setShowIosHint(true)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--green)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Cómo instalar
            </button>
          )}
          <button
            onClick={handleDismiss}
            style={{
              padding: "4px",
              background: "none",
              border: "none",
              fontSize: 11,
              color: "var(--text-3)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Ahora no
          </button>
        </div>
      </div>

      {/* Instrucciones iOS — tooltip que apunta al botón compartir */}
      {showIosHint && (
        <div style={{
          position: "fixed",
          bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 2rem)",
          maxWidth: 380,
          background: "var(--text)",
          color: "var(--bg)",
          borderRadius: 14,
          padding: "18px 20px",
          zIndex: 1000,
          boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
          animation: "banner-up 0.25s ease-out both",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            Cómo instalar en iPhone
          </div>

          {[
            {
              step: "1",
              icon: (
                /* Ícono de compartir de iOS */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              ),
              text: <>Tocá el botón <strong>Compartir</strong> en la barra de Safari</>,
            },
            {
              step: "2",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              ),
              text: <>Seleccioná <strong>Añadir a pantalla de inicio</strong></>,
            },
            {
              step: "3",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
              text: <>Tocá <strong>Añadir</strong> — ¡listo!</>,
            },
          ].map(({ step, icon, text }) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {icon}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{text}</div>
            </div>
          ))}

          {/* Flecha que apunta al botón compartir abajo */}
          <div style={{
            marginTop: 6,
            padding: "10px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            textAlign: "center",
            fontSize: 11,
            opacity: 0.6,
          }}>
            El botón compartir está en la barra inferior de Safari ↓
          </div>

          <button
            onClick={() => setShowIosHint(false)}
            style={{
              position: "absolute", top: 12, right: 12,
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none", cursor: "pointer",
              color: "inherit", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
