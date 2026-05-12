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
import { supabase } from "../../lib/supabase";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }      = use(params);
  const router      = useRouter();
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const messagesRef    = useRef<HTMLDivElement>(null);
  const isInitialLoad  = useRef(true);

  const [user, setUser]       = useState<LocalUser | null>(null);
  const [conv, setConv]       = useState<Conversation | null>(null);
  // Título dinámico con el nombre del otro usuario
  const titleOtherName = conv ? (conv.buyerId === user?.id ? conv.sellerName : conv.buyerName) : undefined;
  usePageTitle(titleOtherName ? `Chat con ${titleOtherName}` : "Mensajes");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]       = useState("");
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      const c = await getConversationById(Number(id));
      if (!c) { router.replace("/mensajes"); return; }
      setUser(u);
      setConv(c);
      setMessages(await getMessages(c.id));
      await markConversationRead(c.id, u.id);   // marcar leído al abrir

      // Leer borrador pre-generado desde /reservar (si existe)
      const draftKey = `estamosCerca_draft_${c.id}`;
      const draft = sessionStorage.getItem(draftKey);
      if (draft) {
        setText(draft);
        sessionStorage.removeItem(draftKey);  // usar una sola vez
        // Expandir textarea al tamaño del borrador
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

  // ── Real-time: escuchar mensajes nuevos ──────────────────────
  useEffect(() => {
    if (!conv) return;
    const channel = supabase
      .channel(`conv-${conv.id}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `conversation_id=eq.${conv.id}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const incoming: Message = {
            id:             raw.id as number,
            conversationId: raw.conversation_id as number,
            senderId:       raw.sender_id as string,
            senderInitials: raw.sender_initials as string,
            text:           raw.text as string,
            createdAt:      raw.created_at as string,
          };
          // Evitar duplicados (el remitente ya lo agregó localmente)
          setMessages(prev =>
            prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conv]);

  // ── Auto-resize del textarea ──────────────────────────────────
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  function scrollToBottom(smooth = true) {
    const el = messagesRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  // Carga inicial: scroll síncrono ANTES del paint.
  // Depende también de `ready` porque el contenedor (messagesRef) no existe
  // mientras se muestra el skeleton — sin esto isInitialLoad se marcaba como
  // "done" antes de que el div estuviera montado.
  useLayoutEffect(() => {
    if (!isInitialLoad.current || messages.length === 0) return;
    const el = messagesRef.current;
    if (!el) return; // skeleton todavía visible, esperar al próximo render
    el.scrollTop = el.scrollHeight;
    isInitialLoad.current = false;
  }, [messages, ready]);

  // Mensajes nuevos después de la carga: scroll suave solo si está cerca del fondo
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
    await markConversationRead(conv.id, user.id);  // mis propios mensajes no son "no leídos"
    setText("");
    // Resetear altura del textarea
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages(await getMessages(conv.id));
    // Al enviar propio mensaje siempre scrollear al fondo
    setTimeout(() => scrollToBottom(true), 50);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  if (!ready || !user || !conv) return (
    <div className="chat-wrap" style={{ display: "flex", flexDirection: "column" }}>
      <Navbar />
      {/* Header skeleton */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 1.5rem", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div className="skeleton" style={{ width: 20, height: 14, borderRadius: 3 }} />
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
        <div>
          <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 3, marginBottom: 5 }} />
          <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 3 }} />
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 10, maxWidth: 680, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {[72, 180, 120, 90].map((w, i) => (
          <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end" }}>
            <div className="skeleton" style={{ width: w, height: 36, borderRadius: 10 }} />
          </div>
        ))}
      </div>
      {/* Input skeleton */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "12px 1.5rem", flexShrink: 0 }}>
        <div className="skeleton" style={{ height: 38, borderRadius: 8 }} />
      </div>
    </div>
  );

  const isBuyer    = conv.buyerId === user.id;
  const otherName  = isBuyer ? conv.sellerName    : conv.buyerName;
  const otherInit  = isBuyer ? conv.sellerInitials : conv.buyerInitials;
  // Mostrar prompt de reseña si el comprador ya tuvo mensajes con el vendedor
  const showReviewPrompt = isBuyer && messages.length >= 2;

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
        boxSizing: "border-box",
      }}>
        {messages.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "2.5rem 1rem", gap: 16,
          }}>
            {/* Tarjeta del producto */}
            <Link href={`/producto/${conv.productId}`} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px 16px",
              width: "100%", maxWidth: 320,
              transition: "border-color 0.12s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                background: conv.productBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>
                {conv.productEmoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                  {conv.productTitle}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                  Ver publicación →
                </div>
              </div>
            </Link>

            {/* Avatares */}
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "var(--green-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "var(--green)",
                border: "2px solid var(--bg)", zIndex: 1,
              }}>
                {isBuyer ? conv.buyerInitials : conv.sellerInitials}
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "var(--text-3)",
                border: "2px solid var(--bg)", marginLeft: -10,
              }}>
                {otherInit}
              </div>
            </div>

            {/* Texto */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                {isBuyer
                  ? `Consultá a ${conv.sellerName.split(" ")[0]}`
                  : `${conv.buyerName.split(" ")[0]} está interesado`}
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
          return (
            <div key={msg.id} style={{
              display: "flex",
              flexDirection: isMe ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 8,
            }}>
              {/* Avatar del otro */}
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
                  fontSize: 13,
                  color: isMe ? "#fff" : "var(--text)",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 10, color: "var(--text-3)", marginTop: 3,
                  textAlign: isMe ? "right" : "left",
                }}>
                  {timeAgo(msg.createdAt)}
                </div>
              </div>
            </div>
          );
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
              padding: "4px 12px", borderRadius: 6, whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            Dejar reseña →
          </Link>
        </div>
      )}

      {/* Input */}
      <div style={{
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        padding: "12px 1.5rem",
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", gap: 8, alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Escribí un mensaje..."
            rows={1}
            style={{
              flex: 1,
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--text)",
              background: "var(--bg)",
              outline: "none",
              fontFamily: "inherit",
              resize: "none",
              lineHeight: 1.5,
              overflowY: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? "var(--green)" : "var(--border)",
              color: text.trim() ? "#fff" : "var(--text-3)",
              border: "none", borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13, fontWeight: 500,
              cursor: text.trim() ? "pointer" : "default",
              transition: "all 0.12s",
              flexShrink: 0,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
