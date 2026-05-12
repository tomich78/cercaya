import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import Footer from "./components/Footer";
import FloatingChat from "./components/FloatingChat";

export const metadata: Metadata = {
  title: "EstamosCerca — Compra y vende cerca tuyo",
  description: "La app de compra-venta local de Argentina",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
