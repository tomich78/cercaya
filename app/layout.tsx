import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import Footer from "./components/Footer";
import FloatingChat from "./components/FloatingChat";
import InstallBanner from "./components/InstallBanner";

export const metadata: Metadata = {
  title: "EstamosCerca — Compra y vende cerca tuyo",
  description: "Comprá y vendé productos cerca tuyo. Conectamos vecinos del mismo barrio sin envíos ni comisiones.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "EstamosCerca — Compra y vende cerca tuyo",
    description: "Comprá y vendé productos cerca tuyo. Conectamos vecinos del mismo barrio sin envíos ni comisiones.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://estamoscerca.com.ar",
    siteName: "EstamosCerca",
    images: [{ url: "/logo.png", width: 800, height: 400, alt: "EstamosCerca" }],
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",   // usa toda la pantalla en iPhones con notch
  themeColor: "#0F6E56",
};

// Script que corre ANTES de que React hidrate — evita flash de tema incorrecto
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('estamosCerca-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head suppressHydrationWarning>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* PWA — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EstamosCerca" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }} suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {children}
            </div>
            <Footer />
            <FloatingChat />
            <InstallBanner />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
