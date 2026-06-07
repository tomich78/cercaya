import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import Footer from "./components/Footer";
import FloatingChat from "./components/FloatingChat";

export const metadata: Metadata = {
  title: "EstamosCerca — Compra y vende cerca tuyo",
  description: "Comprá y vendé productos cerca tuyo. Conectamos vecinos del mismo barrio sin envíos ni comisiones.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
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
      </head>
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }} suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {children}
            </div>
            <Footer />
            <FloatingChat />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
