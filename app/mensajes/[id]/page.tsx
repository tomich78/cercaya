"use client";
import { use, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  type Conversation,
  type Message,
} from "../../lib/messages";
import { getProductById } from "../../lib/storage";
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
  const { url, amount, productTitle } = msg.metadata ?? {};
  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 8,
    }}>
      <div style={{
        maxWidth: 280,
        background: isMe ? "#dcfce7" : "var(--surface)",
        border: `1px solid ${isMe ? "#86efac" : "var(--border)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span>💳</span> Solicitud de pago
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5, lineHeight: 1.1 }}>
          ${amount?.toLocaleString("es-AR") ?? "—"}
        </div>
        {productTitle && (
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, marginBottom: 10 }}>
            {productTitle}
          </div>
        )}
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
      const res = await fetch("/api/pagos/producto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

// ── Página principal ──────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const messagesRef    = useRef<HTMLDivElement>(null);
  const isInitialLoad  = useRef(true);

  const [user,     setUser]     = useState<LocalUser | null>(null);
  const [conv,     setConv]     = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text,     setText]     = useState("");
  const [ready,    setReady]    = useState(false);
  const [payPanel, setPayPanel] = useState(false);

  const titleOtherName = conv ? (conv.buyerId === user?.id ? conv.sellerName : conv.buyerName) : undefined;
  usePageTitle(titleOtherName ? `Chat con ${titleOtherName}` : "Mensajes");

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      const c = await getConversationById(Number(id));
      if (!c) { router.replace("/mensajes"); return; }
      setUser(u);
      setConv(c);
      setMessages(await getMessages(c.id));
      await markConversationRead(c.id, u.id);

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
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv]);

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
    if (!text.trim() || !user || !conv) return;
    await sendMessage(conv.id, user.id, user.initials, text);
    await markConversationRead(conv.id, user.id);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages(await getMessages(conv.id));
    setTimeout(() => scrollToBottom(true), 50);
  }

  async function handlePaySent() {
    if (!conv) return;
    setPayPanel(false);
    setMessages(await getMessages(conv.id));
    setTimeout(() => scrollToBottom(true), 50);
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
          if (msg.type === "payment_confirmed") {
            return <MensajePagoConfirmado key={msg.id} msg={msg} />;
          }
          if (msg.type === "payment_link") {
            return <TarjetaPago key={msg.id} msg={msg} isMe={isMe} />;
          }
          return <BurbujaNormal key={msg.id} msg={msg} isMe={isMe} otherInit={otherInit} />;
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
            onChange={e => { setText(e.target.value); autoResize(); }}
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
            disabled={!text.trim()}
            style={{
              background: text.trim() ? "var(--green)" : "var(--border)",
              color: text.trim() ? "#fff" : "var(--text-3)",
              border: "none", borderRadius: 8,
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              cursor: text.trim() ? "pointer" : "default",
              transition: "all 0.12s", flexShrink: 0,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
