"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getLocalProducts, incrementProductViews, type LocalProduct } from "../../lib/storage";
import { getCurrentUser, getDisplayName, type LocalUser, type DniStatus } from "../../lib/auth";
import { getOrCreateConversation } from "../../lib/messages";
import { supabase } from "../../lib/supabase";
import { usePageTitle } from "../../lib/usePageTitle";
import { useToast } from "../../components/ToastProvider";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<LocalProduct | null>(null);
  // Título dinámico cuando carga el producto
  usePageTitle(product?.title);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const local = await getLocalProducts();
      const found = local.find(p => String(p.id) === id) ?? null;
      setProduct(found);

      const cu = await getCurrentUser();
      setCurrentUser(cu);

      // Incrementar vistas (solo si no es el dueño del producto)
      if (found && "userId" in found && found.userId) {
        const isOwner = cu?.id === found.userId;
        if (!isOwner) incrementProductViews(found.id);
      }

      if (found && "userId" in found && found.userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", found.userId)
          .single();
        if (profileData) {
          const dniStatus = (profileData.dni_status as string | null) ?? "none";
          setLocalUser({
            id:               profileData.id as string,
            name:             profileData.name as string,
            email:            "",
            initials:         profileData.initials as string,
            location:         profileData.location as string,
            phoneVerified:    profileData.phone_verified as boolean,
            dniVerified:      dniStatus === "approved",
            dniStatus:        dniStatus as DniStatus,
            isBusiness:           (profileData.is_business as boolean) ?? false,
            businessPaid:         (profileData.business_paid as boolean) ?? false,
            businessName:         profileData.business_name as string | undefined,
            businessCategory:     profileData.business_category as string | undefined,
            businessHours:        profileData.business_hours as string | undefined,
            businessDesc:         profileData.business_desc as string | undefined,
            businessCuit:         profileData.business_cuit as string | undefined,
            businessCuitVerified: (profileData.business_cuit_verified as boolean) ?? false,
            businessSlug:         profileData.business_slug as string | undefined,
            mpLinked:             !!(profileData.mp_access_token as string | null),
            mpUserId:             profileData.mp_user_id as number | undefined,
            createdAt:            profileData.created_at as string,
          });
        }
      }

      setHydrated(true);
    })();
  }, [id]);

  const displayed = product;

  if (!displayed && !hydrated) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
          {/* breadcrumb */}
          <div className="skeleton" style={{ width: 48, height: 14, marginBottom: 24, borderRadius: 4 }} />
          <div className="two-col-product">
            {/* Columna izquierda */}
            <div>
              <div className="skeleton" style={{ height: 300, borderRadius: 8, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 54, height: 22, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ width: "75%", height: 26, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 32, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "45%", height: 14, borderRadius: 4, marginBottom: 28 }} />
              <div className="skeleton" style={{ height: 1, marginBottom: 18 }} />
              <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 3, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 14, borderRadius: 3, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 14, borderRadius: 3, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "70%", height: 14, borderRadius: 3 }} />
            </div>
            {/* Columna derecha */}
            <div>
              <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayed) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
          Producto no encontrado.
        </div>
      </div>
    );
  }

  const userId = displayed.userId;
  const isOwnProduct = !!currentUser && !!userId && currentUser.id === userId;

  async function handleContact(
    sellerIdArg: string,
    sellerNameArg: string,
    sellerInitialsArg: string,
  ) {
    const u = currentUser ?? await getCurrentUser();
    if (!u) { router.push(`/login?redirect=/producto/${id}`); return; }
    const conv = await getOrCreateConversation({
      productId:        displayed!.id,
      productTitle:     displayed!.title,
      productEmoji:     displayed!.emoji,
      productBg:        displayed!.bg,
      buyerId:          u.id,
      buyerName:        u.name,
      buyerInitials:    u.initials,
      sellerId:         sellerIdArg,
      sellerName:       sellerNameArg,
      sellerInitials:   sellerInitialsArg,
    });
    router.push(`/mensajes/${conv.id}`);
  }

  // ── Story helpers ─────────────────────────────────────────────────────────────
  function drawEmojiBg(ctx: CanvasRenderingContext2D, W: number, H: number, bg?: string, emoji?: string) {
    ctx.fillStyle = bg ?? "#1a1a2e";
    ctx.fillRect(0, 0, W, H);
    if (emoji) {
      ctx.font         = "bold 320px serif";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, W / 2, H / 2 - 80);
    }
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: displayed!.title,
          text:  `${displayed!.title} — ${displayed!.price}`,
          url,
        });
        return;
      } catch { /* usuario canceló */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("¡Link copiado al portapapeles!", "success");
    } catch {
      toast("No se pudo copiar el link", "error");
    }
  }

  function handleShareWhatsApp() {
    const url  = window.location.href;
    const text = `${displayed!.title} — ${displayed!.price}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function handleShareStory() {
    if (!displayed) return;
    setStoryLoading(true);

    try {
      const W = 1080, H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // ── Fondo ──────────────────────────────────────────────────
      const firstImage = "images" in displayed && displayed.images?.[0];

      if (firstImage) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => {
            img.onload  = () => res();
            img.onerror = () => rej();
            img.src = firstImage;
          });
          const scale = Math.max(W / img.width, H / img.height);
          const sw = img.width * scale, sh = img.height * scale;
          ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        } catch {
          drawEmojiBg(ctx, W, H, displayed.bg, displayed.emoji);
        }
      } else {
        drawEmojiBg(ctx, W, H, displayed.bg, displayed.emoji);
      }

      // ── Gradiente oscuro abajo ──────────────────────────────────
      const grad = ctx.createLinearGradient(0, H * 0.3, 0, H);
      grad.addColorStop(0,   "rgba(0,0,0,0)");
      grad.addColorStop(0.45,"rgba(0,0,0,0.55)");
      grad.addColorStop(1,   "rgba(0,0,0,0.93)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ── Branding superior ───────────────────────────────────────
      ctx.textAlign    = "center";
      ctx.fillStyle    = "rgba(255,255,255,0.85)";
      ctx.font         = "600 42px Arial, sans-serif";
      ctx.fillText("📍 EstamosCerca", W / 2, 100);

      // ── Título (word wrap) ──────────────────────────────────────
      ctx.fillStyle = "#ffffff";
      ctx.font      = "bold 96px Arial, sans-serif";
      const titleLines = wrapText(ctx, displayed.title, W - 140);
      const lineH      = 118;
      const totalTitleH = titleLines.length * lineH;
      const titleY     = H - 320 - totalTitleH;
      titleLines.forEach((line, i) => ctx.fillText(line, W / 2, titleY + i * lineH));

      // ── Categoría ───────────────────────────────────────────────
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font      = "500 50px Arial, sans-serif";
      ctx.fillText(displayed.category ?? "", W / 2, H - 220);

      // ── URL ─────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font      = "400 40px Arial, sans-serif";
      ctx.fillText("estamoscerca.com.ar", W / 2, H - 100);

      // ── Exportar ────────────────────────────────────────────────
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("No blob");

      const file = new File([blob], "historia-estamoscerca.jpg", { type: "image/jpeg" });

      // Intentar Web Share API con archivo (funciona en móvil)
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: displayed.title });
      } else {
        // Fallback: descarga directa
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = `historia-${displayed.title.slice(0, 30)}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Imagen descargada · Subila a tus Historias de Instagram 📱", "success");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        toast("No se pudo generar la imagen", "error");
      }
    }

    setStoryLoading(false);
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Inicio
        </Link>

        <div className="two-col-product">

          {/* Columna izquierda */}
          <div>
            {/* Galería de imágenes */}
            {"images" in displayed && displayed.images && displayed.images.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                {/* Imagen principal */}
                <div style={{ borderRadius: 8, overflow: "hidden", height: 300, marginBottom: 8, background: "var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayed.images[activeImg]}
                    alt={displayed.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                {/* Miniaturas (si hay más de 1) */}
                {displayed.images.length > 1 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {displayed.images.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: 60, height: 60, padding: 0, borderRadius: 6,
                          overflow: "hidden", flexShrink: 0, cursor: "pointer",
                          border: `2px solid ${i === activeImg ? "var(--green)" : "var(--border)"}`,
                          background: "none",
                          transition: "border-color 0.1s",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: displayed.bg,
                borderRadius: 8,
                height: 260,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 88, marginBottom: 20,
              }}>
                {displayed.emoji}
              </div>
            )}

            <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, color: "var(--text-3)", background: "var(--bg)",
                border: "1px solid var(--border)", padding: "3px 9px", borderRadius: 4,
                fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: 0.3,
              }}>
                {displayed.category}
              </span>
              {"condition" in displayed && displayed.condition && (
                <span style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 4,
                  fontWeight: 600, letterSpacing: 0.2,
                  background: displayed.condition === "Nuevo" ? "var(--green-subtle)" : "var(--bg)",
                  color:      displayed.condition === "Nuevo" ? "var(--green)" : "var(--text-3)",
                  border:     `1px solid ${displayed.condition === "Nuevo" ? "var(--green)" : "var(--border)"}`,
                }}>
                  {displayed.condition}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px", letterSpacing: -0.5, lineHeight: 1.2 }}>
              {displayed.title}
            </h1>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--green)", marginBottom: 8, letterSpacing: -0.8 }}>
              {displayed.price}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>
              {displayed.location} · <span style={{ color: "var(--green)", fontWeight: 500 }}>{displayed.distance}</span>
            </div>

            {/* Stock */}
            {!displayed.sold && typeof displayed.stock === "number" && (
              <div style={{ marginBottom: 16 }}>
                {displayed.stock <= 3 ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600,
                    color: "var(--yellow-text)",
                    background: "var(--yellow-subtle)",
                    border: "1px solid var(--yellow-border)",
                    borderRadius: 5, padding: "3px 9px",
                  }}>
                    ⚠️ {displayed.stock === 1 ? "¡Última unidad!" : `Solo ${displayed.stock} unidades`}
                  </span>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 500,
                    color: "var(--text-3)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 5, padding: "3px 9px",
                  }}>
                    📦 {displayed.stock} unidades disponibles
                  </span>
                )}
              </div>
            )}

            {/* Botones de compartir */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                onClick={handleShare}
                title="Copiar link"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 14px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 6, fontSize: 13, fontWeight: 500,
                  color: "var(--text-2)", cursor: "pointer",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--text-3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {/* Link icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Compartir
              </button>

              <button
                onClick={handleShareWhatsApp}
                title="Compartir por WhatsApp"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 14px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 6, fontSize: 13, fontWeight: 500,
                  color: "#25d366", cursor: "pointer",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--green-bg)"; e.currentTarget.style.borderColor = "#25d366"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {/* WhatsApp icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 8 }}>
                Descripción
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)", margin: 0 }}>
                {displayed.description}
              </p>
            </div>

            {/* Panel de atributos específicos por tipo */}
            {displayed.listingType && displayed.listingType !== "product" && displayed.attributes && Object.keys(displayed.attributes).length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 12 }}>
                  {displayed.listingType === "service"  ? "Detalles del servicio" :
                   displayed.listingType === "property" ? "Detalles del inmueble" :
                   "Detalles del vehículo"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                  {/* Servicio */}
                  {displayed.listingType === "service" && (<>
                    {displayed.attributes.modalidad && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Modalidad</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {displayed.attributes.modalidad === "presencial" ? "📍 Presencial" :
                           displayed.attributes.modalidad === "remoto"     ? "💻 Remoto" :
                           "📍/💻 Presencial y remoto"}
                        </div>
                      </div>
                    )}
                    {displayed.attributes.precioTipo && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Precio por</div>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" as const }}>
                          {displayed.attributes.precioTipo === "convenir" ? "A convenir" : displayed.attributes.precioTipo as string}
                        </div>
                      </div>
                    )}
                    {displayed.attributes.disponibilidad && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Disponibilidad</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.disponibilidad as string}</div>
                      </div>
                    )}
                  </>)}
                  {/* Inmueble */}
                  {displayed.listingType === "property" && (<>
                    {displayed.attributes.operacion && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Operación</div>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" as const }}>
                          {displayed.attributes.operacion === "alquiler_temp" ? "Alquiler temporal" : displayed.attributes.operacion as string}
                        </div>
                      </div>
                    )}
                    {displayed.attributes.superficie && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Superficie</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.superficie as string} m²</div>
                      </div>
                    )}
                    {displayed.attributes.ambientes && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Ambientes</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.ambientes as string}</div>
                      </div>
                    )}
                    {displayed.attributes.dormitorios && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Dormitorios</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.dormitorios as string}</div>
                      </div>
                    )}
                    {displayed.attributes.banos && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Baños</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.banos as string}</div>
                      </div>
                    )}
                    {displayed.attributes.expensas && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Expensas</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>${displayed.attributes.expensas as string}/mes</div>
                      </div>
                    )}
                    {displayed.attributes.garaje && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Garaje</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>✅ Incluye garaje</div>
                      </div>
                    )}
                  </>)}
                  {/* Vehículo */}
                  {displayed.listingType === "vehicle" && (<>
                    {displayed.attributes.marca && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Marca</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.marca as string}</div>
                      </div>
                    )}
                    {displayed.attributes.modelo && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Modelo</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.modelo as string}</div>
                      </div>
                    )}
                    {displayed.attributes.anio && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Año</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{displayed.attributes.anio as string}</div>
                      </div>
                    )}
                    {displayed.attributes.km && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Kilómetros</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{Number(displayed.attributes.km).toLocaleString("es-AR")} km</div>
                      </div>
                    )}
                    {displayed.attributes.combustible && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Combustible</div>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" as const }}>{displayed.attributes.combustible as string}</div>
                      </div>
                    )}
                    {displayed.attributes.transmision && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Transmisión</div>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" as const }}>{displayed.attributes.transmision as string}</div>
                      </div>
                    )}
                    {displayed.attributes.color && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Color</div>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" as const }}>{displayed.attributes.color as string}</div>
                      </div>
                    )}
                  </>)}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 12 }}>
                Entrega
              </div>
              <div style={{
                border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", marginBottom: 10,
              }}>
                <div style={{
                  width: 34, height: 34, background: "var(--text)", borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>U</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Envío con Uber</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>Recibilo hoy en tu domicilio</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>~$3.500</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                O coordinar retiro presencial con el vendedor en un lugar público
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="sticky-col">
            {localUser ? (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "1.25rem",
              }}>
                {isOwnProduct && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: "var(--green)",
                      background: "var(--green-subtle)", padding: "4px 10px",
                      borderRadius: 4, display: "inline-block",
                      letterSpacing: 0.2, marginBottom: 10,
                    }}>
                      Tu publicación
                    </div>
                    {/* Botón compartir en Instagram Stories */}
                    <button
                      onClick={handleShareStory}
                      disabled={storyLoading}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        width: "100%", padding: "9px 14px",
                        background: storyLoading ? "var(--border)" : "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                        color: storyLoading ? "var(--text-3)" : "#fff",
                        border: "none", borderRadius: 7,
                        fontSize: 13, fontWeight: 600, cursor: storyLoading ? "default" : "pointer",
                        transition: "opacity 0.15s",
                        opacity: storyLoading ? 0.7 : 1,
                      }}
                    >
                      {storyLoading ? (
                        "Generando imagen..."
                      ) : (
                        <>
                          {/* Instagram icon */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Compartir en Historia
                        </>
                      )}
                    </button>
                  </div>
                )}
                {!isOwnProduct && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                    Vendedor
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "var(--green-subtle)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 600, color: "var(--green)", flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    {localUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={localUser.avatarUrl} alt={getDisplayName(localUser)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : localUser.initials}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{getDisplayName(localUser)}</div>
                      {localUser.isBusiness && (
                        localUser.businessCuitVerified
                          ? <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, padding: "1px 6px", borderRadius: 3, background: "var(--green)", color: "#fff" }}>✓ Verificado</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, padding: "1px 6px", borderRadius: 3, background: "var(--blue)", color: "#fff" }}>Negocio</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      {localUser.isBusiness && localUser.businessCategory
                        ? localUser.businessCategory
                        : localUser.location}
                    </div>
                    {localUser.isBusiness && localUser.businessHours && (
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                        🕐 {localUser.businessHours}
                      </div>
                    )}
                  </div>
                </div>

                {/* Link a la página del negocio */}
                {localUser.isBusiness && localUser.businessSlug && !isOwnProduct && (
                  <Link
                    href={`/negocio/${localUser.businessSlug}`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", marginBottom: 12,
                      background: "var(--green-subtle)",
                      border: "1px solid var(--green)",
                      borderRadius: 7, textDecoration: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🏪</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>
                          {localUser.businessName ?? "Ver negocio"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          Ver todos los productos →
                        </div>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                )}

                {"sold" in displayed && displayed.sold && !isOwnProduct && (
                  <div style={{
                    width: "100%", padding: "11px", textAlign: "center",
                    background: "var(--bg)", color: "var(--text-3)",
                    border: "1px solid var(--border)", borderRadius: 6,
                    fontSize: 13, fontWeight: 500, marginBottom: 8,
                    boxSizing: "border-box",
                  }}>
                    Este producto ya fue vendido
                  </div>
                )}
                {!isOwnProduct && !("sold" in displayed && displayed.sold) && (
                  <>
                    <Link
                      href={`/reservar/${displayed.id}`}
                      style={{
                        display: "block", width: "100%", padding: "11px", textAlign: "center",
                        background: "var(--green)", color: "#fff",
                        border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", marginBottom: 8, textDecoration: "none",
                        letterSpacing: -0.1, boxSizing: "border-box",
                      }}
                    >
                      Reservar producto →
                    </Link>
                    <button
                      onClick={() => handleContact(localUser!.id, getDisplayName(localUser!), localUser!.initials)}
                      style={{
                        width: "100%", padding: "9px", background: "transparent", color: "var(--text-2)",
                        border: "1px solid var(--border)", borderRadius: 6, fontSize: 13,
                        fontWeight: 400, cursor: "pointer", marginBottom: 8,
                      }}
                    >
                      Enviar mensaje
                    </button>
                    <Link href={`/vendedor/${localUser.id}`} style={{ display: "block", textAlign: "center", fontSize: 12, color: "var(--text-3)", padding: "4px 0" }}>
                      Ver perfil completo →
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
