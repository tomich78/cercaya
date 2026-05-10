import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "CercaYa — Compra y vende cerca tuyo",
  description: "La app de compra-venta local de Argentina",
};

// Script que corre ANTES de que React hidrate — evita flash de tema incorrecto
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('cercaya-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, minHeight: "100vh" }}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
