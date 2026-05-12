"use client";

// template.tsx se remonta en cada navegación (a diferencia de layout.tsx),
// lo que dispara la animación CSS en cada cambio de página.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      {children}
    </div>
  );
}
