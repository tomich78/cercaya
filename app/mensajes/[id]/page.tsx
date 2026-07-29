"use client";
import React, { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getCurrentUser, type LocalUser } from "../../lib/auth";
import { usePageTitle } from "../../lib/usePageTitle";
import {
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
  getUserConversations,
  isConversationUnread,
  type Conversation,
  type Message,
} from "../../lib/messages";
import { getProductById, type LocalProduct } from "../../lib/storage";
import { supabase } from "../../lib/supabase";

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

/** Parsea precio argentino "$15.000" → 15000 */
function parsePrecioARS(price: string): number | null {
  const clean = price
    .replace(/[$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? null : num;
}

// ── Burbuja de mensaje normal ─────────────────────────────────

function BurbujaNormal({ msg, isMe, otherInit }: { msg: Message; isMe: boolean; otherInit: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 8,
    }}>
      {!isMe && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600, color: "var(--text-3)",
          flexShrink: 0,
        }}>
          {otherInit}
        </div>
      )}
      <div style={{ maxWidth: "68%" }}>
        <div style={{
          padding: "9px 13px",
          borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
          background: isMe ? "var(--green)" : "var(--surface)",
          border: isMe ? "none" : "1px solid var(--border)",
          fontSize: 13, color: isMe ? "#fff" : "var(--text)",
          lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap",
        }}>
          {msg.text}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
          {timeAgo(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de link de pago ───────────────────────────────────

function TarjetaPago({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const { url, amount, productTitle, disabled } = msg.metadata ?? {};
  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 8,
    }}>
      <div style={{
        maxWidth: "min(280px, 85vw)",
        background: disabled ? "var(--surface)" : isMe ? "#dcfce7" : "var(--surface)",
        border: `1px solid ${disabled ? "var(--border)" : isMe ? "#86efac" : "var(--border)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        opacity: disabled ? 0.7 : 1,
      }}>
        <div style={{ fontSize: 11, color: disabled ? "var(--text-3)" : "var(--text-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span>{disabled ? "🚫" : "💳"}</span>
          {disabled ? "Solicitud de pago vencida" : "Solicitud de pago"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: disabled ? "var(--text-3)" : "var(--text)", letterSpacing: -0.5, lineHeight: 1.1 }}>
          ${amount?.toLocaleString("es-AR") ?? "—"}
        </div>
        {productTitle && (
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, marginBottom: 10 }}>
            {productTitle}
          </div>
        )}
        {disabled ? (
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, padding: "7px 10px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)", textAlign: "center" }}>
            El vendedor cambió su cuenta de pago.<br />Pedile que genere un nuevo cobro.
          </div>
        ) : (
          <>
            {!isMe && url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", marginTop: 10,
                  background: "#009ee3", color: "#fff",
                  border: "none", borderRadius: 7,
                  padding: "8px 14px", fontSize: 13, fontWeight: 600,
                  textAlign: "center", textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Pagar con Mercado Pago →
              </a>
            )}
            {isMe && (
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
                Link enviado al comprador
              </div>
            )}
          </>
        )}
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, textAlign: isMe ? "right" : "left" }}>
          {timeAgo(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ── Mensaje de confirmación de pago ──────────────────────────

function MensajePagoConfirmado({ msg }: { msg: Message }) {
  const amount = msg.metadata?.amount;
  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--green-subtle)", border: "1px solid #86efac",
        borderRadius: 20, padding: "7px 16px",
        fontSize: 13, color: "var(--green)", fontWeight: 600,
      }}>
        ✅ Pago confirmado{amount ? ` — $${amount.toLocaleString("es-AR")}` : ""}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
        {timeAgo(msg.createdAt)}
      </div>
    </div>
  );
}

// ── Panel de cobro (vendedor) ─────────────────────────────────

function PanelCobro({
  conv,
  user,
  onSent,
  onClose,
}: {
  conv: Conversation;
  user: LocalUser;
  onSent: () => void;
  onClose: () => void;
}) {
  const [amount,    setAmount]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [loadPrice, setLoadPrice] = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!conv.productId) { setLoadPrice(false); return; }
    getProductById(conv.productId).then(p => {
      if (p) {
        const parsed = parsePrecioARS(p.price);
        if (parsed) setAmount(String(parsed));
      }
      setLoadPrice(false);
    });
  }, [conv.productId]);

  async function handleGenerar() {
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) { setError("Ingresá un monto válido"); return; }
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pagos/producto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          sellerId:       user.id,
          buyerId:        conv.buyerId,
          productId:      conv.productId,
          conversationId: conv.id,
          amount:         num,
          title:          conv.productTitle,
        }),
      });
      const data = await res.json() as { initPoint?: string; preferenceId?: string; error?: string };
      if (!res.ok || !data.initPoint) {
        setError(data.error ?? "Error al generar el link. Intentá de nuevo.");
        setLoading(false);
        return;
      }
      // Enviar como mensaje de tipo payment_link
      await sendMessage(
        conv.id,
        user.id,
        user.initials,
        `Solicitud de pago por $${num.toLocaleString("es-AR")}`,
        "payment_link",
        {
          url:          data.initPoint,
          amount:       num,
          productTitle: conv.productTitle,
          preferenceId: data.preferenceId,
        },
      );
      onSent();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)", borderTop: "1px solid var(--border)",
      padding: "12px 1.5rem",
      maxWidth: 680, width: "100%", margin: "0 auto",
      boxSizing: "border-box" as const,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>💳</span> Generar cobro con Mercado Pago
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>
            Monto a cobrar (ARS)
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "var(--text-3)", pointerEvents: "none",
            }}>$</span>
            <input
              value={loadPrice ? "" : amount}
              onChange={e => { setAmount(e.target.value.replace(/[^0-9.,]/g, "")); setError(""); }}
              placeholder={loadPrice ? "Cargando precio..." : "0"}
              disabled={loadPrice || loading}
              inputMode="decimal"
              style={{
                width: "100%", padding: "8px 10px 8px 22px",
                border: `1px solid ${error ? "#dc2626" : "var(--border)"}`,
                borderRadius: 6, fontSize: 14, fontWeight: 600,
                color: "var(--text)", background: "var(--bg)",
                outline: "none", fontFamily: "inherit",
                boxSizing: "border-box" as const,
              }}
            />
          </div>
          {error && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{error}</div>}
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>
            MP cobra su comisión al comprador · Vos recibís el total
          </div>
        </div>

        <button
          onClick={handleGenerar}
          disabled={loading || loadPrice || !amount}
          style={{
            background: loading || !amount ? "var(--border)" : "#009ee3",
            color: loading || !amount ? "var(--text-3)" : "#fff",
            border: "none", borderRadius: 7,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: loading || !amount ? "default" : "pointer",
            flexShrink: 0, marginTop: 20,
            transition: "all 0.12s",
          }}
        >
          {loading ? "Generando..." : "Enviar link"}
        </button>
      </div>
    </div>
  );
}

// ── Panel de chats recientes ──────────────────────────────────

function RecentChatsPanel({
  convs,
  currentId,
  userId,
}: {
  convs: Array<{ conv: Conversation; unread: boolean }>;
  currentId: number;
  userId: string;
}) {
  return (
    <div style={{ padding: "14px 10px", display: "flex", flexDirection: "column" as const, gap: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
        Chats recientes
      </div>

      {convs.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", padding: "12px 0" }}>
          Sin chats aún
        </div>
      )}

      {convs.map(({ conv, unread }) => {
        const isCurrent  = conv.id === currentId;
        const otherName  = conv.buyerId === userId ? conv.sellerName : conv.buyerName;
        const lastMsg    = conv.lastMessage ?? "";
        return (
          <Link
            key={conv.id}
            href={`/mensajes/${conv.id}`}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 8px", borderRadius: 7, textDecoration: "none",
              background: isCurrent ? "var(--green-subtle)" : "transparent",
              border: `1px solid ${isCurrent ? "var(--green)" : "transparent"}`,
              transition: "background 0.1s",
            }}
            onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--border)"; }}
            onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Emoji del producto */}
            <div style={{
              width: 30, height: 30, borderRadius: 6, flexShrink: 0,
              background: conv.productBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>
              {conv.productEmoji}
            </div>

            {/* Info */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: unread && !isCurrent ? 700 : 500,
                color: isCurrent ? "var(--green)" : "var(--text)",
                whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {otherName.split(" ")[0]}
              </div>
              <div style={{
                fontSize: 10, color: "var(--text-3)",
                whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {lastMsg || conv.productTitle}
              </div>
            </div>

            {/* Punto de no leído */}
            {unread && !isCurrent && (
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
            )}
          </Link>
        );
      })}

      <Link
        href="/mensajes"
        style={{
          display: "block", textAlign: "center", marginTop: 10,
          fontSize: 10, color: "var(--text-3)", textDecoration: "none",
          padding: "4px",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
      >
        Ver todos →
      </Link>
    </div>
  );
}

// ── Sidebar de producto ───────────────────────────────────────

function ProductoSidebar({ product, conv }: { product: LocalProduct | null; conv: Conversation }) {
  const hasSold = product?.sold;
  return (
    <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column" as const, gap: 10 }}>

      {/* Título del panel */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: 0.8 }}>
        Producto
      </div>

      {/* Imagen compacta */}
      <Link href={`/producto/${conv.productId}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{
          width: "100%", height: 120,
          borderRadius: 8, overflow: "hidden",
          background: conv.productBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", flexShrink: 0,
        }}>
          {product?.images?.[0] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.images[0]}
              alt={conv.productTitle}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ fontSize: 36 }}>{conv.productEmoji}</span>
          )}
          {hasSold && (
            <div style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.65)", color: "#fff",
              fontSize: 9, fontWeight: 700, padding: "2px 6px",
              borderRadius: 4, letterSpacing: 0.3,
            }}>
              VENDIDO
            </div>
          )}
        </div>
      </Link>

      {/* Título + precio */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.35, marginBottom: 3 }}>
          {conv.productTitle}
        </div>
        {product?.price && (
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", letterSpacing: -0.3 }}>
            {product.price}
          </div>
        )}
      </div>

      {/* Badges */}
      {(product?.condition || product?.negotiable) && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
          {product?.condition && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
              background: product.condition === "Nuevo" ? "var(--blue-subtle)" : "var(--green-subtle)",
              color: product.condition === "Nuevo" ? "var(--blue)" : "var(--green)",
              border: `1px solid ${product.condition === "Nuevo" ? "var(--blue)" : "var(--green)"}`,
              opacity: 0.85,
            }}>
              {product.condition}
            </span>
          )}
          {product?.negotiable && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
              background: "var(--green-bg)", color: "var(--green)", border: "1px solid var(--green-border)",
            }}>
              Negociable
            </span>
          )}
        </div>
      )}

      {/* Descripción */}
      {product?.description && (
        <div style={{
          fontSize: 11, color: "var(--text-2)", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {product.description}
        </div>
      )}

      {/* Ubicación y entrega */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
        {product?.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)" }}>
            <span>📍</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {product.location}
            </span>
          </div>
        )}
        {product?.delivery && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)" }}>
            <span>{product.delivery === "envio" ? "🚚" : product.delivery === "retiro" ? "🤝" : "🚚🤝"}</span>
            {product.delivery === "envio" ? "Envío disponible" : product.delivery === "retiro" ? "Solo retiro" : "Envío o retiro"}
          </div>
        )}
      </div>

      {/* Link */}
      <Link
        href={`/producto/${conv.productId}`}
        style={{
          display: "block", textAlign: "center", marginTop: 4,
          fontSize: 11, fontWeight: 600, color: "var(--green)",
          background: "var(--green-subtle)", border: "1px solid var(--green)",
          borderRadius: 6, padding: "6px 10px", textDecoration: "none",
        }}
      >
        Ver publicación →
      </Link>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const messagesRef    = useRef<HTMLDivElement>(null);
  const isInitialLoad  = useRef(true);

  const [user,        setUser]        = useState<LocalUser | null>(null);
  const [conv,        setConv]        = useState<Conversation | null>(null);
  const [product,     setProduct]     = useState<LocalProduct | null>(null);
  const [recentConvs, setRecentConvs] = useState<Array<{ conv: Conversation; unread: boolean }>>([]);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [text,        setText]        = useState("");
  const [ready,       setReady]       = useState(false);
  const [payPanel,    setPayPanel]    = useState(false);
  const [sending,     setSending]     = useState(false);
  const userRef = useRef<LocalUser | null>(null);

  const titleOtherName = conv ? (conv.buyerId === user?.id ? conv.sellerName : conv.buyerName) : undefined;
  usePageTitle(titleOtherName ? `Chat con ${titleOtherName}` : "Mensajes");

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      const c = await getConversationById(Number(id));
      if (!c) { router.replace("/mensajes"); return; }
      setUser(u);
      userRef.current = u;
      setConv(c);
      setMessages(await getMessages(c.id));
      await markConversationRead(c.id, u.id);
      if (c.productId) {
        const p = await getProductById(c.productId);
        if (p) setProduct(p);
      }

      // Cargar últimos 5 chats con estado de no leído
      const allConvs = await getUserConversations(u.id);
      const withUnread = await Promise.all(
        allConvs.slice(0, 5).map(async rc => ({ conv: rc, unread: await isConversationUnread(rc, u.id) })),
      );
      setRecentConvs(withUnread);

      const draftKey = `estamosCerca_draft_${c.id}`;
      const draft = sessionStorage.getItem(draftKey);
      if (draft) {
        setText(draft);
        sessionStorage.removeItem(draftKey);
        setTimeout(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
        }, 50);
      }
      setReady(true);
    })();
  }, [id, router]);

  // Real-time
  useEffect(() => {
    if (!conv) return;
    const channel = supabase
      .channel(`conv-${conv.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "messages", filter: `conversation_id=eq.${conv.id}`,
      }, async (payload) => {
        const rawId = (payload.new as Record<string, unknown>).id as number;
        // Refetch el mensaje completo para garantizar type y metadata
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("id", rawId)
          .single();
        if (!data) return;
        const incoming: Message = {
          id:             data.id as number,
          conversationId: data.conversation_id as number,
          senderId:       data.sender_id as string,
          senderInitials: data.sender_initials as string,
          text:           data.text as string,
          type:           (data.type as Message["type"]) ?? "text",
          metadata:       (data.metadata as Message["metadata"]) ?? undefined,
          createdAt:      data.created_at as string,
        };
        const currentUserId = userRef.current?.id;
        setMessages(prev => {
          // Eliminar placeholder optimista propio cuando llega el mensaje real del servidor
          const base = incoming.senderId === currentUserId
            ? prev.filter(m => m.id > 0)
            : prev;
          return base.some(m => m.id === incoming.id) ? base : [...base, incoming];
        });
        // Marcar como leído si el mensaje lo envió el otro usuario (chat abierto)
        if (incoming.senderId !== currentUserId && currentUserId && conv) {
          markConversationRead(conv.id, currentUserId);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv]);

  // Real-time: actualizar chats recientes cuando llega un mensaje en CUALQUIER conv del usuario
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const ch = supabase
      .channel("recent-convs-watch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" },
        async (payload) => {
          const r = payload.new as Record<string, unknown>;
          if (r.buyer_id === uid || r.seller_id === uid) {
            const all = await getUserConversations(uid);
            const withUnread = await Promise.all(
              all.slice(0, 5).map(async rc => ({ conv: rc, unread: await isConversationUnread(rc, uid) })),
            );
            setRecentConvs(withUnread);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  function scrollToBottom(smooth = true) {
    const el = messagesRef.current;
    if (!el) return;
    smooth
      ? el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      : (el.scrollTop = el.scrollHeight);
  }

  useLayoutEffect(() => {
    if (!isInitialLoad.current || messages.length === 0) return;
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isInitialLoad.current = false;
  }, [messages, ready]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    const el = messagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) scrollToBottom(true);
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !user || !conv || sending) return;
    const tempText = text.trim();
    setSending(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (conv) sessionStorage.removeItem(`estamosCerca_draft_${conv.id}`);

    // Mensaje optimista — se muestra de inmediato con id negativo temporal
    const optimisticId = -Date.now();
    const optimisticMsg: Message = {
      id:             optimisticId,
      conversationId: conv.id,
      senderId:       user.id,
      senderInitials: user.initials,
      text:           tempText,
      type:           "text",
      createdAt:      new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      const recipientId = conv.buyerId === user.id ? conv.sellerId : conv.buyerId;
      await sendMessage(conv.id, user.id, user.initials, tempText, "text", undefined, recipientId, user.name);
      await markConversationRead(conv.id, user.id);
      // El realtime se encarga de reemplazar el optimista con el mensaje real
    } catch {
      // Error: eliminar optimista y restaurar texto
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setText(tempText);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
      }
    } finally {
      setSending(false);
    }
  }

  async function handlePaySent() {
    setPayPanel(false);
    setTimeout(() => scrollToBottom(true), 100);
    // El realtime agrega el mensaje de pago automáticamente
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Skeleton ──────────────────────────────────────────────────
  if (!ready || !user || !conv) return (
    <div className="chat-wrap" style={{ display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 1.5rem", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div className="skeleton" style={{ width: 20, height: 14, borderRadius: 3 }} />
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
        <div>
          <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 3, marginBottom: 5 }} />
          <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 10, maxWidth: 680, width: "100%", margin: "0 auto", boxSizing: "border-box" as const }}>
        {[72, 180, 120, 90].map((w, i) => (
          <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end" }}>
            <div className="skeleton" style={{ width: w, height: 36, borderRadius: 10 }} />
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "12px 1.5rem", flexShrink: 0 }}>
        <div className="skeleton" style={{ height: 38, borderRadius: 8 }} />
      </div>
    </div>
  );

  const isBuyer   = conv.buyerId === user.id;
  const isSeller  = !isBuyer;
  const otherName = isBuyer ? conv.sellerName    : conv.buyerName;
  const otherInit = isBuyer ? conv.sellerInitials : conv.buyerInitials;

  const showReviewPrompt = isBuyer && messages.length >= 2;
  // Mostrar botón de cobro si es el vendedor con negocio activo y MP vinculado
  const canCharge = isSeller && user.isBusiness && user.businessPaid && user.mpLinked;

  return (
    <div className="chat-wrap" style={{ display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* Layout principal: 3 columnas */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* Izquierda: chats recientes */}
      <aside className="chat-side-panel" style={{ borderRight: "1px solid var(--border)" }}>
        <RecentChatsPanel convs={recentConvs} currentId={conv.id} userId={user.id} />
      </aside>

      {/* Centro: chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden", minWidth: 0 }}>

      {/* Header */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "12px 1.5rem",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <Link href="/mensajes" style={{ fontSize: 13, color: "var(--text-3)", marginRight: 4 }}>←</Link>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          background: conv.productBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>
          {conv.productEmoji}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{otherName}</div>
          <Link href={`/producto/${conv.productId}`} style={{ fontSize: 11, color: "var(--text-3)" }}>
            {conv.productTitle}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="chat-messages" style={{
        flex: 1, overflowY: "auto",
        padding: "1.25rem 1.5rem",
        display: "flex", flexDirection: "column", gap: 8,
        maxWidth: 680, width: "100%", margin: "0 auto",
        boxSizing: "border-box" as const,
      }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem", gap: 16 }}>
            <Link href={`/producto/${conv.productId}`} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px 16px",
              width: "100%", maxWidth: 320, transition: "border-color 0.12s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, background: conv.productBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                {conv.productEmoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{conv.productTitle}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Ver publicación →</div>
              </div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--green-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--green)", border: "2px solid var(--bg)", zIndex: 1 }}>
                {isBuyer ? conv.buyerInitials : conv.sellerInitials}
              </div>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--text-3)", border: "2px solid var(--bg)", marginLeft: -10 }}>
                {otherInit}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                {isBuyer ? `Consultá a ${conv.sellerName.split(" ")[0]}` : `${conv.buyerName.split(" ")[0]} está interesado`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, maxWidth: 260 }}>
                {isBuyer
                  ? "Preguntá sobre el estado, precio o dónde coordinar el encuentro."
                  : "Respondé las preguntas del comprador para cerrar el trato."}
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.senderId === user.id;
          const isOptimistic = msg.id < 0;
          const wrapper = (child: React.ReactNode) => (
            <div key={msg.id} style={isOptimistic ? { opacity: 0.6, transition: "opacity 0.15s" } : undefined}>
              {child}
            </div>
          );
          if (msg.type === "payment_confirmed") {
            return wrapper(<MensajePagoConfirmado msg={msg} />);
          }
          if (msg.type === "payment_link") {
            return wrapper(<TarjetaPago msg={msg} isMe={isMe} />);
          }
          return wrapper(<BurbujaNormal msg={msg} isMe={isMe} otherInit={otherInit} />);
        })}

        <div ref={bottomRef} />
      </div>

      {/* Prompt de reseña */}
      {showReviewPrompt && (
        <div style={{
          background: "var(--green-subtle)", borderTop: "1px solid #c5e8dc",
          padding: "10px 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, gap: 12,
        }}>
          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
            ¿Cerraste el trato con {conv.sellerName.split(" ")[0]}?
          </div>
          <Link
            href={`/vendedor/${conv.sellerId}`}
            style={{
              fontSize: 12, fontWeight: 600, color: "var(--green)",
              background: "#fff", border: "1px solid var(--green)",
              padding: "4px 12px", borderRadius: 6, whiteSpace: "nowrap" as const,
              textDecoration: "none",
            }}
          >
            Dejar reseña →
          </Link>
        </div>
      )}

      {/* Panel de cobro (vendedor con MP vinculado) */}
      {payPanel && canCharge && (
        <PanelCobro
          conv={conv}
          user={user}
          onSent={handlePaySent}
          onClose={() => setPayPanel(false)}
        />
      )}

      {/* Input */}
      <div style={{
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        padding: "12px 1.5rem", flexShrink: 0,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>

          {/* Botón cobrar — solo visible para el vendedor con MP vinculado */}
          {canCharge && (
            <button
              onClick={() => setPayPanel(p => !p)}
              title="Generar cobro con Mercado Pago"
              style={{
                background: payPanel ? "var(--green-subtle)" : "var(--bg)",
                color: payPanel ? "var(--green)" : "var(--text-3)",
                border: `1px solid ${payPanel ? "var(--green)" : "var(--border)"}`,
                borderRadius: 8, padding: "9px 11px",
                fontSize: 16, cursor: "pointer",
                flexShrink: 0, transition: "all 0.12s",
              }}
            >
              💳
            </button>
          )}

          {/* Sugerencia al vendedor negocio sin MP vinculado */}
          {isSeller && user.isBusiness && user.businessPaid && !user.mpLinked && (
            <Link
              href="/perfil"
              title="Vinculá Mercado Pago para cobrar desde el chat"
              style={{
                background: "var(--bg)", color: "var(--text-3)",
                border: "1px solid var(--border)",
                borderRadius: 8, padding: "9px 11px",
                fontSize: 16, flexShrink: 0, textDecoration: "none",
                display: "flex", alignItems: "center",
              }}
            >
              💳
            </Link>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => {
              setText(e.target.value);
              autoResize();
              // Guardar borrador automáticamente
              const key = `estamosCerca_draft_${conv.id}`;
              if (e.target.value) sessionStorage.setItem(key, e.target.value);
              else sessionStorage.removeItem(key);
            }}
            onKeyDown={handleKey}
            placeholder="Escribí un mensaje..."
            rows={1}
            style={{
              flex: 1, padding: "9px 12px",
              border: "1px solid var(--border)", borderRadius: 8,
              fontSize: 13, color: "var(--text)", background: "var(--bg)",
              outline: "none", fontFamily: "inherit",
              resize: "none", lineHeight: 1.5, overflowY: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              background: text.trim() && !sending ? "var(--green)" : "var(--border)",
              color: text.trim() && !sending ? "#fff" : "var(--text-3)",
              border: "none", borderRadius: 8,
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              cursor: text.trim() && !sending ? "pointer" : "default",
              transition: "all 0.12s", flexShrink: 0,
            }}
          >
            {sending ? "..." : "Enviar"}
          </button>
        </div>
      </div>

      </div> {/* fin centro chat */}

      {/* Derecha: producto */}
      <aside className="chat-side-panel" style={{ borderLeft: "1px solid var(--border)" }}>
        <ProductoSidebar product={product} conv={conv} />
      </aside>

      </div> {/* fin layout principal */}
    </div>
  );
}
