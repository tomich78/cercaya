"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast } from "../components/ToastProvider";

// ─── Datos de FAQ ─────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    category: "Cuenta y perfil",
    icon: "👤",
    items: [
      {
        q: "¿Cómo creo una cuenta?",
        a: "Tocá «Entrar» en la barra superior y luego «Crear cuenta». Solo necesitás un email y contraseña. El registro es gratuito y lleva menos de un minuto.",
      },
      {
        q: "¿Cómo cambio mi nombre o zona?",
        a: "Entrá a tu perfil (ícono de usuario arriba a la derecha) y tocá «Editar perfil». Podés actualizar tu nombre y zona en cualquier momento.",
      },
      {
        q: "¿Para qué sirve verificar el teléfono o el DNI?",
        a: "Las verificaciones aumentan la confianza de los compradores. Un perfil verificado recibe más consultas y genera más credibilidad. El badge «Verificado» aparece en tus publicaciones y perfil.",
      },
      {
        q: "¿Qué es el modo Negocio?",
        a: "Es una suscripción mensual que te permite mostrar el nombre de tu negocio, categoría, horarios y verificar tu CUIT. Ideal para comercios, emprendedores y profesionales que quieren diferenciarse.",
      },
    ],
  },
  {
    category: "Publicaciones",
    icon: "📦",
    items: [
      {
        q: "¿Cuánto cuesta publicar?",
        a: "¡Publicar es 100% gratis! Podés subir hasta 5 fotos, describir el producto y ponerle precio sin costo. Si querés destacar tu publicación para que aparezca primero en el feed, tenés la opción de pagar el servicio de «Destacado».",
      },
      {
        q: "¿Cómo edito o elimino una publicación?",
        a: "Desde tu perfil, en la sección «Mis publicaciones», encontrás los botones «Editar» y «Eliminar» debajo de cada producto. Los cambios se reflejan de inmediato.",
      },
      {
        q: "¿Cómo marco un producto como vendido?",
        a: "En tu perfil, debajo de cada publicación, tocá «Marcar vendido». El producto deja de aparecer en el feed pero lo seguís viendo en tu perfil con el badge «Vendido». Podés reactivarlo cuando quieras.",
      },
      {
        q: "¿Qué es un producto «Destacado»?",
        a: "Los productos destacados aparecen primero en el feed con un badge dorado y borde especial. La suscripción dura 30 días desde el momento de la activación.",
      },
    ],
  },
  {
    category: "Compras y contacto",
    icon: "🛒",
    items: [
      {
        q: "¿Cómo contacto a un vendedor?",
        a: "Desde la página del producto, tocá «Enviar mensaje» o «Reservar producto». Se abre un chat directo con el vendedor donde podés coordinar precio, estado y entrega.",
      },
      {
        q: "¿EstamosCerca procesa pagos?",
        a: "No. EstamosCerca es una plataforma de contacto — el pago y la entrega se coordinan directamente entre comprador y vendedor. Recomendamos siempre encontrarse en lugares públicos y preferir transferencia bancaria.",
      },
      {
        q: "¿Cómo reservo un producto?",
        a: "Desde la página del producto tocá «Reservar producto». Elegís el método de pago y entrega preferido, y se genera un mensaje estructurado que se envía al vendedor automáticamente.",
      },
      {
        q: "¿Puedo dejar una reseña al vendedor?",
        a: "Sí. Después de tener una conversación con el vendedor, aparece un prompt en el chat para calificarlo. También podés ir directamente al perfil del vendedor y usar la sección de reseñas.",
      },
    ],
  },
  {
    category: "Seguridad",
    icon: "🔒",
    items: [
      {
        q: "¿Cómo sé si un vendedor es confiable?",
        a: "Fijate en los badges: «✓ Verificado» (DNI verificado), «Negocio» (cuenta business activa). También podés ver sus reseñas y cuánto tiempo lleva en la plataforma en su perfil.",
      },
      {
        q: "¿Cómo reporto una publicación o usuario?",
        a: "Por ahora podés escribirnos directamente a hola@EstamosCerca.com.ar con el link de la publicación o perfil. Revisamos todos los reportes en menos de 24 horas.",
      },
      {
        q: "¿Mis datos están seguros?",
        a: "Sí. Usamos Supabase con encriptación en tránsito (HTTPS) y en reposo. Nunca compartimos tus datos personales con terceros. Podés leer nuestra política de privacidad para más detalles.",
      },
    ],
  },
] as const;

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left",
          padding: "14px 0",
          background: "none", border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>
          {q}
        </span>
        <span style={{
          fontSize: 18, color: "var(--text-3)", flexShrink: 0,
          transition: "transform 0.2s",
          display: "inline-block",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}>
          +
        </span>
      </button>
      {open && (
        <div style={{
          fontSize: 13, color: "var(--text-2)", lineHeight: 1.75,
          paddingBottom: 14,
          animation: "faq-open 0.18s ease-out both",
        }}>
          <style>{`@keyframes faq-open { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AyudaPage() {
  usePageTitle("Centro de ayuda");
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Formulario de contacto
  const [form,    setForm]    = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast("Completá todos los campos obligatorios", "error");
      return;
    }
    setSending(true);
    // Simulación — en producción conectar con Resend / EmailJS / etc.
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    toast("¡Mensaje enviado! Te respondemos en menos de 24 h 👌");
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  const visibleFaqs = activeSection
    ? FAQ_SECTIONS.filter(s => s.category === activeSection)
    : FAQ_SECTIONS;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Encabezado ── */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: "12px 0 6px" }}>
            Centro de ayuda
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
            Encontrá respuestas a las preguntas más frecuentes o escribinos directamente.
          </p>
        </div>

        {/* ── Filtros de categoría ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <button
            onClick={() => setActiveSection(null)}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 13,
              border: "1px solid",
              borderColor: !activeSection ? "var(--green)" : "var(--border)",
              background:  !activeSection ? "var(--green-subtle)" : "var(--surface)",
              color:       !activeSection ? "var(--green)" : "var(--text-2)",
              fontWeight:  !activeSection ? 600 : 400,
              cursor: "pointer",
            }}
          >
            Todas
          </button>
          {FAQ_SECTIONS.map(s => (
            <button
              key={s.category}
              onClick={() => setActiveSection(s.category === activeSection ? null : s.category)}
              style={{
                padding: "6px 14px", borderRadius: 999, fontSize: 13,
                border: "1px solid",
                borderColor: activeSection === s.category ? "var(--green)" : "var(--border)",
                background:  activeSection === s.category ? "var(--green-subtle)" : "var(--surface)",
                color:       activeSection === s.category ? "var(--green)" : "var(--text-2)",
                fontWeight:  activeSection === s.category ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {s.icon} {s.category}
            </button>
          ))}
        </div>

        {/* ── FAQ sections ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {visibleFaqs.map(section => (
            <div
              key={section.category}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8, padding: "0 20px",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "16px 0 12px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 18 }}>{section.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: -0.2 }}>
                  {section.category}
                </span>
              </div>
              {section.items.map(item => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Contacto ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1.5rem",
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 6 }}>
              ¿No encontraste lo que buscabas?
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
              Escribinos y te respondemos en menos de 24 horas hábiles.
              También podés escribirnos directo a{" "}
              <a href="mailto:hola@EstamosCerca.com.ar" style={{ color: "var(--green)", fontWeight: 500 }}>
                hola@EstamosCerca.com.ar
              </a>
            </div>
          </div>

          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="contact-grid">
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Tu nombre"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Asunto</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Ej: No puedo publicar un producto"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Mensaje *</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Describí tu problema o consulta con el mayor detalle posible..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              style={{
                alignSelf: "flex-start",
                background: "var(--green)", color: "#fff",
                border: "none", borderRadius: 6,
                padding: "9px 22px", fontSize: 13, fontWeight: 600,
                cursor: sending ? "default" : "pointer",
                opacity: sending ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12, fontWeight: 500,
  color: "var(--text-3)",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--text)",
  background: "var(--bg)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
