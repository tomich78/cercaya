"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { getCurrentUser, getDisplayName, type LocalUser } from "../../lib/auth";
import { usePageTitle } from "../../lib/usePageTitle";
import { supabase } from "../../lib/supabase";
import {
  getReviewsForSeller,
  hasReviewed,
  addReview,
  calcStats,
  type Review,
} from "../../lib/reviews";
import { getOrCreateConversation } from "../../lib/messages";
import { getLocalProducts, type LocalProduct } from "../../lib/storage";

// ─── Star selector ─────────────────────────────────────────────────────────────

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 26, padding: "2px",
            color: active >= n ? "#d97706" : "var(--border)",
            transition: "color 0.1s",
            lineHeight: 1,
          }}
        >★</button>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

// Shape for a real Supabase profile acting as seller
interface ProfileSeller {
  id: string;
  name: string;
  initials: string;
  location: string;
  avatarUrl?: string;
  phoneVerified: boolean;
  dniVerified: boolean;
  memberSince: string;
  isBusiness: boolean;
  businessName?: string;
  businessCategory?: string;
  businessHours?: string;
  businessDesc?: string;
  businessCuitVerified?: boolean;
}

export default function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [profileSeller, setProfileSeller] = useState<ProfileSeller | null>(null);
  const [realProducts, setRealProducts] = useState<LocalProduct[]>([]);
  // Título dinámico con nombre del vendedor/negocio
  const titleSellerName = profileSeller
    ? (profileSeller.isBusiness && profileSeller.businessName ? profileSeller.businessName : profileSeller.name)
    : undefined;
  usePageTitle(titleSellerName ? `Perfil de ${titleSellerName}` : undefined);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [currentUser, setCurrentUser]   = useState<LocalUser | null>(null);
  const [stats, setStats]               = useState<{ rating: number; count: number }>({ rating: 0, count: 0 });
  const [ready, setReady]               = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [text, setText]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setCurrentUser(u);

      // Real Supabase user — perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (profileData) {
        setProfileSeller({
          id:               profileData.id as string,
          name:             profileData.name as string,
          initials:         profileData.initials as string,
          location:         profileData.location as string,
          avatarUrl:        profileData.avatar_url as string | undefined,
          phoneVerified:    profileData.phone_verified as boolean,
          dniVerified:      (profileData.dni_status as string) === "approved",
          memberSince:      new Date(profileData.created_at as string).toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
          isBusiness:           (profileData.is_business as boolean) ?? false,
          businessName:         profileData.business_name as string | undefined,
          businessCategory:     profileData.business_category as string | undefined,
          businessHours:        profileData.business_hours as string | undefined,
          businessDesc:         profileData.business_desc as string | undefined,
          businessCuitVerified: (profileData.business_cuit_verified as boolean) ?? false,
        });
      }
      // Publicaciones reales de este vendedor
      const allProds = await getLocalProducts();
      setRealProducts(allProds.filter(p => p.userId === id && !p.sold));

      const reviews = await getReviewsForSeller(id);
      setLocalReviews(reviews);

      const computedStats = await calcStats(id, []);
      setStats(computedStats);

      if (u) {
        const reviewed = await hasReviewed(u.id, id);
        setAlreadyReviewed(reviewed);
      }

      setReady(true);
    })();
  }, [id]);

  const seller = profileSeller;

  // Nombre a mostrar: nombre del negocio si está activo, si no el nombre personal
  const sellerDisplayName = profileSeller?.isBusiness && profileSeller.businessName
    ? profileSeller.businessName
    : seller?.name ?? "";

  if (!ready) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header del vendedor */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.5rem", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
            <div className="skeleton" style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "55%", height: 20, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "35%", height: 13, borderRadius: 3, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "40%", height: 13, borderRadius: 3, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: 100, height: 28, borderRadius: 6 }} />
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 8 }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="skeleton" style={{ flex: 1, height: 52, borderRadius: 6 }} />
            ))}
          </div>
        </div>
        {/* Grid de productos */}
        <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 3, marginBottom: 12 }} />
        <div className="product-grid">
          {[1,2,3,4].map(i => (
            <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div className="skeleton" style={{ height: 120 }} />
              <div style={{ padding: "10px 12px 12px" }}>
                <div className="skeleton" style={{ height: 13, borderRadius: 3, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "60%", height: 16, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!seller) return (
    <div>
      <Navbar />
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
        Vendedor no encontrado.
      </div>
    </div>
  );

  const trustLevel = seller.phoneVerified && seller.dniVerified ? "full"
    : seller.phoneVerified ? "partial" : "none";

  const displayRating = stats.rating;
  const displayCount  = stats.count;

  async function handleSubmit() {
    if (!rating || !text.trim() || !currentUser) return;
    await addReview({
      sellerId:          id,
      reviewerId:        currentUser.id,
      reviewerName:      currentUser.name,
      reviewerInitials:  currentUser.initials,
      rating,
      text: text.trim(),
    });
    setLocalReviews(await getReviewsForSeller(id));
    setAlreadyReviewed(true);
    setSubmitted(true);
    setRating(0);
    setText("");
  }

  async function handleContact() {
    const u = currentUser ?? await getCurrentUser();
    if (!u) { router.push(`/login?redirect=/vendedor/${id}`); return; }
    const conv = await getOrCreateConversation({
      productId:       null,
      productTitle:    "Consulta general",
      productEmoji:    "💬",
      productBg:       "#f5f5f3",
      buyerId:         u.id,
      buyerName:       u.name,
      buyerInitials:   u.initials,
      sellerId:        id,
      sellerName:      sellerDisplayName || "Vendedor",
      sellerInitials:  seller?.initials ?? "VV",
    });
    router.push(`/mensajes/${conv.id}`);
  }

  const allReviews = localReviews.map(r => ({
    key:      String(r.id),
    name:     r.reviewerName,
    initials: r.reviewerInitials,
    rating:   r.rating,
    text:     r.text,
  }));

  const canReview = !!currentUser && !alreadyReviewed;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          ← Inicio
        </Link>

        {/* Perfil header */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1.5rem", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "var(--green-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "var(--green)", flexShrink: 0,
              overflow: "hidden",
            }}>
              {(seller as ProfileSeller).avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(seller as ProfileSeller).avatarUrl} alt={seller.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : seller.initials}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.4 }}>
                  {(seller as ProfileSeller).isBusiness && (seller as ProfileSeller).businessName
                    ? (seller as ProfileSeller).businessName
                    : seller.name}
                </h1>
                {(seller as ProfileSeller).isBusiness && (
                  (seller as ProfileSeller).businessCuitVerified
                    ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, padding: "2px 7px", borderRadius: 4, background: "var(--green)", color: "#fff" }}>✓ Verificado</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, padding: "2px 7px", borderRadius: 4, background: "var(--blue)", color: "#fff" }}>Negocio</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
                {/* Si es negocio: mostrar nombre personal como titular */}
                {(seller as ProfileSeller).isBusiness && (seller as ProfileSeller).businessName
                  ? seller.name
                  : null}
                {(seller as ProfileSeller).isBusiness && (seller as ProfileSeller).businessCategory
                  ? ` · ${(seller as ProfileSeller).businessCategory}`
                  : null}
                {seller.location ? ` · ${seller.location}` : ""}
                {seller.memberSince ? ` · Desde ${seller.memberSince}` : ""}
              </div>
            </div>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, marginBottom: 18,
            background: trustLevel === "full" ? "var(--green-subtle)" : trustLevel === "partial" ? "var(--yellow-subtle)" : "var(--bg)",
            color: trustLevel === "full" ? "var(--green)" : trustLevel === "partial" ? "var(--amber)" : "var(--text-3)",
          }}>
            {trustLevel === "full" ? "✓ Verificado completo" :
              trustLevel === "partial" ? "~ Verificación parcial" : "Sin verificar"}
          </div>

          {/* Business info block */}
          {(seller as ProfileSeller).isBusiness && (
            <div style={{
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "12px 14px", marginBottom: 18,
            }}>
              {(seller as ProfileSeller).businessDesc && (
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 8px", lineHeight: 1.6 }}>
                  {(seller as ProfileSeller).businessDesc}
                </p>
              )}
              {(seller as ProfileSeller).businessHours && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}>
                  <span>🕐</span>
                  <span>{(seller as ProfileSeller).businessHours}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(1, 1fr)",
            border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 20,
          }}>
            <div style={{ padding: "12px 8px", textAlign: "center", background: "var(--bg)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706", marginBottom: 3 }}>
                ★ {displayRating || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>reputación ({displayCount})</div>
            </div>
          </div>

          {/* Verifications */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--text-3)",
              textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10,
            }}>
              Verificaciones de identidad
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Teléfono", sub: "Número de celular confirmado", ok: seller.phoneVerified },
                { label: "DNI", sub: "Identidad confirmada con documento", ok: seller.dniVerified },
              ].map(v => (
                <div key={v.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 6,
                  background: v.ok ? "var(--green-subtle)" : "var(--bg)",
                  border: `1px solid ${v.ok ? "#c5e8dc" : "var(--border)"}`,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: v.ok ? "var(--green)" : "var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: v.ok ? "#fff" : "var(--text-3)", flexShrink: 0, fontWeight: 700,
                  }}>
                    {v.ok ? "✓" : "—"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: v.ok ? "var(--green)" : "var(--text-3)" }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: v.ok ? "#3d9470" : "var(--text-3)" }}>{v.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reseñas */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "1.25rem", marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: -0.2 }}>
            Reseñas
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>
              ({allReviews.length})
            </span>
          </div>

          {allReviews.length > 0 && (
            <div style={{ marginBottom: canReview ? 20 : 0 }}>
              {allReviews.map((r, i) => (
                <div key={r.key} style={{
                  paddingBottom: i < allReviews.length - 1 ? 14 : 0,
                  marginBottom:  i < allReviews.length - 1 ? 14 : 0,
                  borderBottom:  i < allReviews.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "var(--bg)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 600, color: "var(--text-2)",
                      }}>
                        {r.initials}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                    </div>
                    <div style={{ color: "#d97706", fontSize: 13, letterSpacing: 1 }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{r.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de reseña */}
          {canReview && (
            <div style={{
              borderTop: allReviews.length ? "1px solid var(--border)" : "none",
              paddingTop: allReviews.length ? 16 : 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                Dejá tu reseña
              </div>
              <StarSelector value={rating} onChange={setRating} />
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Contá tu experiencia con este vendedor..."
                rows={3}
                style={{
                  width: "100%", padding: "8px 10px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 13, color: "var(--text)", background: "var(--bg)",
                  outline: "none", fontFamily: "inherit",
                  resize: "vertical", lineHeight: 1.6, marginBottom: 10,
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!rating || !text.trim()}
                style={{
                  background: rating && text.trim() ? "var(--green)" : "var(--border)",
                  color: rating && text.trim() ? "#fff" : "var(--text-3)",
                  border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500,
                  cursor: rating && text.trim() ? "pointer" : "default",
                  transition: "all 0.12s",
                }}
              >
                Publicar reseña
              </button>
            </div>
          )}

          {submitted && (
            <div style={{
              marginTop: 12, fontSize: 13, color: "var(--green)",
              background: "var(--green-subtle)", padding: "8px 12px",
              borderRadius: 6, fontWeight: 500,
            }}>
              ✓ Reseña publicada. ¡Gracias!
            </div>
          )}

          {!currentUser && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: allReviews.length ? 16 : 0, borderTop: allReviews.length ? "1px solid var(--border)" : "none", paddingTop: allReviews.length ? 14 : 0 }}>
              <Link href={`/login?redirect=/vendedor/${id}`} style={{ color: "var(--green)", fontWeight: 500 }}>
                Iniciá sesión
              </Link>{" "}para dejar una reseña.
            </div>
          )}

          {alreadyReviewed && !submitted && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              Ya dejaste una reseña para este vendedor.
            </div>
          )}
        </div>

        {/* Publicaciones */}
        {realProducts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.3, marginBottom: 12 }}>
              Publicaciones de {sellerDisplayName.split(" ")[0]}
            </div>
            <div className="product-grid">
              {realProducts.map(p => (
                <Link key={p.id} href={`/producto/${p.id}`}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "border-color 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#bfbfbb"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
                    <div style={{ height: 96, overflow: "hidden" }}>
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ background: p.bg, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>{p.emoji}</div>
                      )}
                    </div>
                    <div style={{ padding: "9px 11px 11px" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, lineHeight: 1.3, color: "var(--text)" }}>{p.title}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", letterSpacing: -0.3 }}>{p.price}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleContact}
          style={{
            width: "100%", padding: "11px", background: "var(--green)", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Contactar a {sellerDisplayName.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}
