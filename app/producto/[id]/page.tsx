"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { products, sellers } from "../../data";
import { getLocalProducts, type LocalProduct } from "../../lib/storage";
import { getCurrentUser, type LocalUser, type DniStatus } from "../../lib/auth";
import { getOrCreateConversation } from "../../lib/messages";
import { supabase } from "../../lib/supabase";

type AnyProduct = (typeof products)[0] | LocalProduct;

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const router = useRouter();
  const [product, setProduct] = useState<AnyProduct | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    (async () => {
      const local = await getLocalProducts();
      const all: AnyProduct[] = [...local, ...products];
      const found = all.find(p => String(p.id) === id) ?? null;
      setProduct(found);

      const cu = await getCurrentUser();
      setCurrentUser(cu);

      if (found && "userId" in found && found.userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", found.userId)
          .single();
        if (profileData) {
          const dniStatus = (profileData.dni_status as string | null) ?? "none";
          setLocalUser({
            id:            profileData.id as string,
            name:          profileData.name as string,
            email:         "",
            initials:      profileData.initials as string,
            location:      profileData.location as string,
            phoneVerified: profileData.phone_verified as boolean,
            dniVerified:   dniStatus === "approved",
            dniStatus:     dniStatus as DniStatus,
            createdAt:     profileData.created_at as string,
          });
        }
      }

      setHydrated(true);
    })();
  }, [id]);

  // Mientras no hidrata, intentar encontrar en mock data para evitar flash
  const mockProduct = products.find(p => p.id === Number(id));
  const displayed = product ?? mockProduct ?? null;

  if (!displayed && !hydrated) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          Cargando...
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

  const seller = sellers.find(s => s.id === displayed.sellerId);
  const userId = "userId" in displayed ? displayed.userId : undefined;
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
  const trustLevel = seller
    ? seller.phoneVerified && seller.dniVerified ? "full"
      : seller.phoneVerified ? "partial" : "none"
    : "none";

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
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
              {displayed.location} · <span style={{ color: "var(--green)", fontWeight: 500 }}>{displayed.distance}</span>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 8 }}>
                Descripción
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)", margin: 0 }}>
                {displayed.description}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 12 }}>
                Entrega
              </div>
              <div style={{
                border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", marginBottom: 10,
              }}>
                <div style={{
                  width: 34, height: 34, background: "#111", borderRadius: 6,
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
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--green)",
                    background: "var(--green-subtle)", padding: "4px 10px",
                    borderRadius: 4, display: "inline-block",
                    marginBottom: 14, letterSpacing: 0.2,
                  }}>
                    Tu publicación
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
                      <img src={localUser.avatarUrl} alt={localUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : localUser.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{localUser.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      {localUser.location}
                    </div>
                  </div>
                </div>
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
                      onClick={() => handleContact(localUser!.id, localUser!.name, localUser!.initials)}
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
            ) : seller ? (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "1.25rem",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                  Vendedor
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "var(--green-subtle)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 600, color: "var(--green)", flexShrink: 0,
                  }}>
                    {seller.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{seller.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Desde {seller.memberSince}</div>
                  </div>
                </div>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, marginBottom: 14,
                  background: trustLevel === "full" ? "var(--green-subtle)" : trustLevel === "partial" ? "#fef3c7" : "var(--bg)",
                  color: trustLevel === "full" ? "var(--green)" : trustLevel === "partial" ? "var(--amber)" : "var(--text-3)",
                }}>
                  {trustLevel === "full" ? "✓ Verificado completo" :
                    trustLevel === "partial" ? "~ Verificación parcial" : "Sin verificar"}
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                  border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 14,
                }}>
                  {[
                    { val: String(seller.sales), lbl: "ventas" },
                    { val: `★ ${seller.rating}`, lbl: "reputación", amber: true },
                    { val: seller.responseTime, lbl: "respuesta" },
                  ].map((s, i) => (
                    <div key={s.lbl} style={{
                      padding: "9px 6px", textAlign: "center", background: "var(--bg)",
                      borderRight: i < 2 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.amber ? "#d97706" : "var(--text)" }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>
                    Identidad
                  </div>
                  {[
                    { label: "Teléfono", ok: seller.phoneVerified },
                    { label: "DNI", ok: seller.dniVerified },
                  ].map(v => (
                    <div key={v.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>{v.label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: v.ok ? "var(--green)" : "var(--text-3)",
                        background: v.ok ? "var(--green-subtle)" : "transparent",
                        padding: v.ok ? "2px 7px" : "0", borderRadius: 3,
                      }}>
                        {v.ok ? "Verificado" : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{
                  width: "100%", padding: "10px", background: "var(--bg)", color: "var(--text-3)",
                  border: "1px solid var(--border)", borderRadius: 6, fontSize: 12,
                  textAlign: "center", marginBottom: 8, lineHeight: 1.4,
                }}>
                  Vendedor de demostración
                </div>

                <Link href={`/vendedor/${seller.id}`} style={{
                  display: "block", textAlign: "center", fontSize: 12,
                  color: "var(--text-3)", padding: "6px 0",
                }}>
                  Ver perfil completo →
                </Link>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
