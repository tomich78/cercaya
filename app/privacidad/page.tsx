"use client";
import Link from "next/link";
import Navbar from "../components/Navbar";

const LAST_UPDATED = "1 de mayo de 2025";

const SECTIONS = [
  {
    title: "1. Responsable del tratamiento",
    content: `EstamosCerca es la plataforma responsable del tratamiento de los datos personales de sus usuarios, de conformidad con la Ley 25.326 de Protección de Datos Personales de la República Argentina y sus normas reglamentarias.

Para ejercer tus derechos o realizar consultas sobre el tratamiento de tus datos, podés contactarnos en hola@EstamosCerca.com.ar.`,
  },
  {
    title: "2. Datos que recopilamos",
    content: `Al usar EstamosCerca podemos recopilar los siguientes datos:

Datos que vos nos proporcionás:
• Nombre y apellido
• Dirección de correo electrónico
• Contraseña (almacenada en forma encriptada, nunca en texto plano)
• Número de teléfono (si elegís verificarlo)
• Fotografía de perfil (si la subís voluntariamente)
• Fotografía del DNI (solo si solicitás la verificación de identidad)
• CUIT (solo para usuarios con cuenta de tipo Negocio)
• Ubicación geográfica aproximada (barrio o ciudad)

Datos generados por el uso del servicio:
• Publicaciones y sus contenidos (fotos, descripciones, precios)
• Mensajes enviados a través del chat interno
• Historial de búsquedas y alertas guardadas
• Productos guardados como favoritos
• Reseñas recibidas y emitidas`,
  },
  {
    title: "3. Finalidad del tratamiento",
    content: `Utilizamos tus datos exclusivamente para:

• Crear y gestionar tu cuenta de usuario
• Mostrar tus publicaciones a otros usuarios de la plataforma
• Facilitar la comunicación entre compradores y vendedores
• Verificar tu identidad cuando lo solicitás voluntariamente
• Enviarte notificaciones sobre tu actividad en la plataforma
• Mejorar la experiencia y funcionalidades del servicio
• Detectar y prevenir fraudes o usos indebidos
• Cumplir con obligaciones legales cuando corresponda

No utilizamos tus datos para elaborar perfiles comerciales ni para venderlos a terceros.`,
  },
  {
    title: "4. Base legal del tratamiento",
    content: `El tratamiento de tus datos se realiza sobre las siguientes bases legales:

• Ejecución del contrato: para prestarte el servicio que solicitaste al registrarte
• Consentimiento: para funcionalidades opcionales como verificación de identidad o geolocalización
• Interés legítimo: para mejorar la plataforma, detectar fraudes y garantizar la seguridad
• Obligación legal: cuando la ley argentina nos lo exija`,
  },
  {
    title: "5. Compartición de datos con terceros",
    content: `EstamosCerca no vende ni alquila tus datos personales a terceros. Solo los compartimos en los siguientes casos:

Proveedores de infraestructura tecnológica:
• Supabase (base de datos y autenticación) — los datos se almacenan en servidores con cifrado en tránsito y en reposo
• Vercel (hosting de la aplicación) — solo gestiona el tráfico web, no accede a datos de usuarios

Requerimiento legal:
• Si una autoridad judicial o administrativa argentina lo solicita mediante orden legal fundada

En ningún caso compartimos datos con empresas de marketing, publicidad comportamental ni brokers de datos.`,
  },
  {
    title: "6. Conservación de los datos",
    content: `Conservamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, tus datos personales serán eliminados en un plazo máximo de 30 días, salvo que exista una obligación legal que requiera conservarlos por más tiempo.

Las fotografías de DNI enviadas para verificación se eliminan dentro de los 7 días posteriores a la resolución del proceso de verificación (aprobación o rechazo).

Los mensajes del chat se conservan mientras la conversación exista. Si eliminás tu cuenta, los mensajes serán anonimizados.`,
  },
  {
    title: "7. Tus derechos",
    content: `De acuerdo con la Ley 25.326, tenés derecho a:

• Acceso: solicitar una copia de todos los datos personales que tenemos sobre vos
• Rectificación: corregir datos inexactos o incompletos
• Supresión: solicitar la eliminación de tus datos ("derecho al olvido")
• Oposición: oponerte al tratamiento de tus datos para determinadas finalidades
• Portabilidad: recibir tus datos en un formato estructurado y legible

Para ejercer cualquiera de estos derechos, escribinos a hola@EstamosCerca.com.ar con el asunto "Datos Personales" y te responderemos dentro de los 5 días hábiles.

La Dirección Nacional de Protección de Datos Personales (DNPDP) es el organismo de control competente en Argentina. Podés presentar una reclamación ante ella si considerás que el tratamiento de tus datos no es conforme a la ley.`,
  },
  {
    title: "8. Seguridad de los datos",
    content: `Implementamos medidas técnicas y organizativas para proteger tus datos:

• Comunicaciones cifradas mediante HTTPS (TLS)
• Contraseñas almacenadas con hash criptográfico (nunca en texto plano)
• Acceso a datos restringido por roles (Row Level Security en base de datos)
• Almacenamiento en Supabase con cifrado en reposo
• Acceso administrativo protegido por autenticación

Sin embargo, ningún sistema es 100% seguro. Si detectamos una brecha de seguridad que afecte tus datos, te notificaremos dentro de las 72 horas de tomar conocimiento del incidente.`,
  },
  {
    title: "9. Cookies y tecnologías similares",
    content: `EstamosCerca utiliza almacenamiento local del navegador (localStorage) para las siguientes finalidades:

• Mantener tu sesión activa (token de autenticación)
• Recordar tu preferencia de tema claro/oscuro
• Registrar si ya viste el mensaje de bienvenida al nuevo usuario

No utilizamos cookies de seguimiento, publicidad comportamental ni herramientas de analítica de terceros que identifiquen a usuarios individuales.`,
  },
  {
    title: "10. Menores de edad",
    content: `EstamosCerca no está dirigida a personas menores de 18 años. No recopilamos conscientemente datos de menores. Si sos padre/madre o tutor y creés que tu hijo/a ha proporcionado datos personales, contactanos en hola@EstamosCerca.com.ar y procederemos a eliminarlos.`,
  },
  {
    title: "11. Cambios en esta política",
    content: `Podemos actualizar esta Política de Privacidad periódicamente. La versión vigente siempre estará disponible en esta página con su fecha de última actualización. Si realizamos cambios significativos, te notificaremos por email o mediante un aviso en la plataforma.`,
  },
];

export default function PrivacidadPage() {
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Encabezado */}
        <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>
        <div style={{ margin: "16px 0 32px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 8px" }}>
            Política de privacidad
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-3)" }}>
            Última actualización: {LAST_UPDATED} · Ley 25.326 de Protección de Datos Personales
          </div>
        </div>

        {/* Intro */}
        <div style={{
          background: "var(--green-subtle)", border: "1px solid",
          borderColor: "var(--green)", borderRadius: 8,
          padding: "14px 16px", marginBottom: 32,
          fontSize: 13, color: "var(--text-2)", lineHeight: 1.7,
        }}>
          Tu privacidad es importante para nosotros. Esta política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos sobre ellos.
        </div>

        {/* Índice */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "16px 20px", marginBottom: 32,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Contenido
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {SECTIONS.map((s, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
              >
                {s.title}
              </a>
            ))}
            <a
              href="#mercadopago"
              style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
            >
              12. Integración con Mercado Pago
            </a>
          </div>
        </div>

        {/* Secciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {SECTIONS.map((s, i) => (
            <div key={i} id={`section-${i}`}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, margin: "0 0 12px", color: "var(--text)" }}>
                {s.title}
              </h2>
              <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {s.content}
              </div>
            </div>
          ))}

          {/* ── Sección especial: Mercado Pago ── */}
          <div id="mercadopago">
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, margin: "0 0 12px", color: "var(--text)" }}>
              12. Integración con Mercado Pago
            </h2>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", marginBottom: 6 }}>
                ¿Por qué EstamosCerca conecta tu cuenta de Mercado Pago?
              </div>
              <div style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.7 }}>
                Los vendedores con Modo Negocio activo pueden vincular su cuenta de Mercado Pago para recibir pagos con tarjeta directamente desde el chat. Esta conexión utiliza el protocolo estándar de autorización OAuth 2.0 — el mismo que usan servicios como Google o Facebook para "Iniciar sesión con…" — y nunca requiere que compartas tu contraseña con nosotros.
              </div>
            </div>

            <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
              {`Permisos solicitados y su finalidad:

• Leer información de la cuenta: solo para confirmar que la vinculación fue exitosa y mostrar el estado de la conexión en tu perfil. No accedemos a tu saldo, ni a tus movimientos, ni a tus datos bancarios.

• Realizar cobros en tu nombre: únicamente cuando vos generás un cobro desde el chat. Cada cobro es iniciado explícitamente por vos como vendedor. No se realiza ninguna transacción sin tu acción.

• Acceso sin re-autenticación (offline_access): permite mantener la conexión activa sin pedirte la contraseña cada vez. El token de acceso se renueva automáticamente de forma segura.

Seguridad y almacenamiento:

Los tokens de acceso de Mercado Pago se almacenan cifrados en nuestra base de datos (Supabase), con cifrado en reposo y en tránsito. Ningún miembro del equipo de EstamosCerca puede ver tus tokens en texto plano.

Lo que EstamosCerca NO hace con tu integración de Mercado Pago:

✕ No consultamos tu saldo ni tus movimientos bancarios
✕ No realizamos pagos o transferencias sin tu acción directa
✕ No compartimos tus tokens con ningún tercero
✕ No guardamos ni tenemos acceso a tu contraseña de Mercado Pago
✕ No utilizamos tu cuenta fuera de la plataforma EstamosCerca

Cómo desvincular tu cuenta:

Podés desvincular tu cuenta de Mercado Pago en cualquier momento desde Perfil → Modo Negocio → Mercado Pago → Desvincular. Esto revoca el acceso de EstamosCerca a tu cuenta de forma inmediata.

Para más información sobre cómo Mercado Pago maneja los datos de aplicaciones conectadas, podés consultar su política de privacidad en mercadopago.com.ar.`}
            </div>
          </div>
        </div>

        {/* Footer legal */}
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)",
          fontSize: 12, color: "var(--text-3)", lineHeight: 1.7,
        }}>
          <strong style={{ color: "var(--text-2)" }}>EstamosCerca</strong> — Plataforma de compraventa local · Argentina<br />
          Consultas sobre privacidad: <a href="mailto:hola@EstamosCerca.com.ar" style={{ color: "var(--green)" }}>hola@EstamosCerca.com.ar</a>
          {" · "}
          <Link href="/terminos" style={{ color: "var(--green)" }}>Términos de uso</Link>
        </div>

      </div>
    </div>
  );
}
