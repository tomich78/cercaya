"use client";
import Link from "next/link";
import Navbar from "../components/Navbar";

const LAST_UPDATED = "1 de mayo de 2025";

const SECTIONS = [
  {
    title: "1. Descripción del servicio",
    content: `EstamosCerca es una plataforma digital de compraventa entre particulares que facilita el contacto entre vendedores y compradores ubicados en la misma zona geográfica. EstamosCerca actúa exclusivamente como intermediario tecnológico y no es parte en ninguna transacción realizada entre usuarios.

El servicio permite publicar artículos para la venta, buscar productos, contactar vendedores mediante mensajería interna y coordinar la entrega o retiro de los productos de forma directa entre las partes.`,
  },
  {
    title: "2. Registro y cuenta de usuario",
    content: `Para acceder a las funcionalidades completas de EstamosCerca es necesario crear una cuenta personal con un correo electrónico válido y una contraseña.

El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda la actividad que ocurra bajo su cuenta. En caso de uso no autorizado, debe notificarnos de inmediato a hola@EstamosCerca.com.ar.

Cada persona puede tener una única cuenta activa. EstamosCerca se reserva el derecho de suspender cuentas duplicadas o creadas con fines fraudulentos.`,
  },
  {
    title: "3. Publicación de productos",
    content: `La publicación de artículos en EstamosCerca es gratuita. El usuario es el único responsable del contenido de sus publicaciones, incluyendo descripciones, precios e imágenes.

Está prohibido publicar:
• Artículos robados, falsificados o de procedencia ilícita
• Armas, municiones, explosivos o sustancias controladas
• Medicamentos sin receta, drogas o estupefacientes
• Material pornográfico o que involucre menores de edad
• Artículos cuya venta esté prohibida por la legislación argentina
• Servicios sexuales o cualquier forma de explotación
• Contenido que incite al odio, la discriminación o la violencia

EstamosCerca puede eliminar sin previo aviso cualquier publicación que viole estas condiciones.`,
  },
  {
    title: "4. Transacciones entre usuarios",
    content: `EstamosCerca no interviene en las transacciones entre usuarios, no procesa pagos, no garantiza la calidad de los productos ni la solvencia de las partes.

El precio, la forma de pago y las condiciones de entrega son acordados exclusivamente entre comprador y vendedor. Recomendamos:

• Realizar los encuentros en lugares públicos y concurridos
• Preferir la transferencia bancaria o Mercado Pago como método de pago
• Verificar el estado del producto antes de efectuar el pago
• No entregar dinero en efectivo sin haber recibido el artículo

EstamosCerca no se responsabiliza por fraudes, estafas, artículos defectuosos, incumplimientos de entrega ni cualquier disputa surgida entre usuarios.`,
  },
  {
    title: "5. Conducta del usuario",
    content: `El usuario se compromete a utilizar la plataforma de buena fe y a no realizar ninguna de las siguientes acciones:

• Publicar información falsa, engañosa o que induzca a error
• Acosar, amenazar o intimidar a otros usuarios
• Usar la plataforma para actividades comerciales masivas sin autorización (spam)
• Intentar acceder a cuentas o datos de otros usuarios sin autorización
• Interferir con el funcionamiento técnico del servicio
• Utilizar sistemas automatizados para extraer datos (scraping)

El incumplimiento de estas normas puede resultar en la suspensión temporal o permanente de la cuenta.`,
  },
  {
    title: "6. Verificaciones de identidad",
    content: `EstamosCerca ofrece de forma voluntaria mecanismos de verificación de identidad (teléfono y DNI) para generar mayor confianza entre usuarios. Estas verificaciones son opcionales y no garantizan por sí solas la conducta del usuario verificado.

La documentación enviada para verificación (fotografías del DNI) se almacena en forma segura y es revisada únicamente por el equipo de moderación de EstamosCerca. No se comparte con terceros salvo requerimiento legal.`,
  },
  {
    title: "7. Propiedad intelectual",
    content: `Todo el contenido de la plataforma (diseño, código, marca, logotipos) es propiedad de EstamosCerca y está protegido por las leyes de propiedad intelectual vigentes en Argentina.

Las imágenes y textos publicados por los usuarios en sus publicaciones son de su exclusiva responsabilidad. Al subirlos, el usuario otorga a EstamosCerca una licencia no exclusiva para mostrarlos dentro de la plataforma.`,
  },
  {
    title: "8. Limitación de responsabilidad",
    content: `EstamosCerca no será responsable por daños directos, indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso del servicio, incluyendo pero no limitándose a:

• Pérdidas económicas derivadas de transacciones entre usuarios
• Daños causados por información falsa publicada por terceros
• Interrupciones del servicio por mantenimiento o causas de fuerza mayor
• Pérdida de datos por fallos técnicos

El uso de EstamosCerca es bajo la exclusiva responsabilidad del usuario.`,
  },
  {
    title: "9. Modificaciones del servicio",
    content: `EstamosCerca se reserva el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en cualquier momento, con o sin previo aviso.

Las presentes condiciones pueden actualizarse periódicamente. La versión vigente siempre estará disponible en esta página. El uso continuado del servicio después de publicar cambios implica la aceptación de los nuevos términos.`,
  },
  {
    title: "10. Jurisdicción y legislación aplicable",
    content: `Los presentes Términos y Condiciones se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que pudiera corresponderles.

Para consultas legales podés escribirnos a hola@EstamosCerca.com.ar.`,
  },
];

export default function TerminosPage() {
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Encabezado */}
        <Link href="/" style={{ fontSize: 13, color: "var(--text-3)" }}>← Inicio</Link>
        <div style={{ margin: "16px 0 32px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 8px" }}>
            Términos y condiciones de uso
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-3)" }}>
            Última actualización: {LAST_UPDATED}
          </div>
        </div>

        {/* Intro */}
        <div style={{
          background: "var(--green-subtle)", border: "1px solid",
          borderColor: "var(--green)", borderRadius: 8,
          padding: "14px 16px", marginBottom: 32,
          fontSize: 13, color: "var(--text-2)", lineHeight: 1.7,
        }}>
          Al registrarte o usar EstamosCerca estás aceptando estos términos. Te recomendamos leerlos completos.
          Si tenés dudas, escribinos a{" "}
          <a href="mailto:hola@EstamosCerca.com.ar" style={{ color: "var(--green)", fontWeight: 500 }}>
            hola@EstamosCerca.com.ar
          </a>
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
        </div>

        {/* Footer legal */}
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)",
          fontSize: 12, color: "var(--text-3)", lineHeight: 1.7,
        }}>
          <strong style={{ color: "var(--text-2)" }}>EstamosCerca</strong> — Plataforma de compraventa local · Argentina<br />
          Consultas: <a href="mailto:hola@EstamosCerca.com.ar" style={{ color: "var(--green)" }}>hola@EstamosCerca.com.ar</a>
          {" · "}
          <Link href="/privacidad" style={{ color: "var(--green)" }}>Política de privacidad</Link>
        </div>

      </div>
    </div>
  );
}
