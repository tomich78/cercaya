"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../lib/auth";
import { getUserConversations, type Conversation } from "../lib/messages";
import { supabase } from "../lib/supabase";

function timeAgo(iso: string): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface ConvWithUnread extends Conversation {
  hasUnread: boolean;
}

export default function FloatingChat() {
  const pathname = usePathname();
  const router   = useRouter();

  const [userId,  setUserId]  = useState<string | null>(null);
  const [convs,   setConvs]   = useState<ConvWithUnread[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [open,    setOpen]    = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);

  // Ocultar en páginas de mensajes
  const hidden = pathname.startsWith("/mensajes") || pathname.startsWith("/login") || pathname.startsWith("/registro");

  // Cargar usuario y conversaciones
  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u) return;
      setUserId(u.id);
      loadConvs(u.id);
    });
  }, []);

  async function loadConvs(uid: string) {
    const all = await getUserConversations(uid);
    const top = all.slice(0, 5);
    if (top.length === 0) { setConvs([]); setUnread(0); return; }

    // Una sola query para todos los reads del usuario (en vez de N queries)
    const { data: reads } = await supabase
      .from("conversation_reads")
      .select("conversation_id, read_at")
      .eq("user_id", uid)
      .in("conversation_id", top.map(c => c.id));

    const readMap = new Map(
      (reads ?? []).map(r => [r.conversation_id as number, r.read_at as string])
    );

    const convsWithUnread = top.map(c => {
      if (!c.lastMessage) return { ...c, hasUnread: false };
      const readAt = readMap.get(c.id);
      const hasUnread = !readAt || c.lastMessageAt > readAt;
      return { ...c, hasUnread };
    });

    setConvs(convsWithUnread);
    setUnread(convsWithUnread.filter(c => c.hasUnread).length);
  }

  // Polling cada 5s como fallback
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => loadConvs(userId), 5000);
    return () => clearInterval(interval);
  }, [userId]);

  // Realtime: actualizar cuando llega mensaje nuevo o cambia una conversación
  useEffect(() => {
    if (!userId) return;

    // Escuchar nuevos mensajes en cualquier conversación del usuario
    const msgChannel = supabase
      .channel("floating-chat-messages")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
      }, () => loadConvs(userId))
      .subscribe();

    // Escuchar cambios en conversations (last_message, etc.)
    const convChannel = supabase
      .channel("floating-chat-convs")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "conversations",
      }, () => loadConvs(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [userId]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (hidden || !userId) return null;

  return (
    <div ref={panelRef} className="hide-mobile" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>

      {/* ── Panel de conversaciones ── */}
      {open && (
        <div style={{
          position: "absolute", bottom: 64, right: 0,
          width: 320, maxHeight: 420,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
          animation: "chat-panel-in 0.18s ease",
        }}>
          <style>{`
            @keyframes chat-panel-in {
              from { opacity: 0; transform: translateY(8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>Mensajes</span>
              {unread > 0 && (
                <span style={{
                  background: "#ef4444", color: "#fff",
                  borderRadius: 999, padding: "1px 7px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {unread} nuevo{unread !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Link
              href="/mensajes"
              onClick={() => setOpen(false)}
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}
            >
              Ver todos →
            </Link>
          </div>

          {/* Lista */}
          {convs.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
              No tenés conversaciones todavía
            </div>
          ) : (
            <div style={{ overflowY: "auto", maxHeight: 340 }}>
              {convs.map(conv => {
                const isMe     = conv.buyerId === userId;
                const otherName = isMe ? conv.sellerName    : conv.buyerName;
                const otherInit = isMe ? conv.sellerInitials : conv.buyerInitials;
                const hasUnread = conv.hasUnread;

                return (
                  <button
                    key={conv.id}
                    onClick={() => { setOpen(false); router.push(`/mensajes/${conv.id}`); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px",
                      background: hasUnread ? "var(--green-subtle)" : "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hasUnread ? "#d1f5e8" : "var(--bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = hasUnread ? "var(--green-subtle)" : "none")}
                  >
                    {/* Avatar con punto de no leído */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%",
                        background: hasUnread ? "var(--green)" : "var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                        color: hasUnread ? "#fff" : "var(--text-3)",
                      }}>
                        {otherInit}
                      </div>
                      {/* Punto verde de "no leído" */}
                      {hasUnread && (
                        <div style={{
                          position: "absolute", bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#ef4444", border: "2px solid var(--surface)",
                        }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: hasUnread ? 700 : 600,
                          color: hasUnread ? "var(--text)" : "var(--text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {otherName}
                        </span>
                        <span style={{
                          fontSize: 10, flexShrink: 0, marginLeft: 6,
                          color: hasUnread ? "#ef4444" : "var(--text-3)",
                          fontWeight: hasUnread ? 700 : 400,
                        }}>
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div style={{
                        fontSize: 11, color: "var(--text-3)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: 1,
                      }}>
                        {conv.productEmoji} {conv.productTitle}
                      </div>

                      {conv.lastMessage && (
                        <div style={{
                          fontSize: 11,
                          color: hasUnread ? "var(--text-2)" : "var(--text-3)",
                          fontWeight: hasUnread ? 600 : 400,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {conv.lastMessage}
                        </div>
                      )}
                    </div>

                    {/* Flecha */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke={hasUnread ? "var(--green)" : "var(--border)"}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Botón flotante ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52, borderRadius: "50%",
          background: open ? "var(--text)" : "var(--green)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          transition: "background 0.15s, transform 0.15s",
          position: "relative",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        title="Mensajes"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}

        {/* Badge de no leídos */}
        {!open && unread > 0 && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 18, height: 18, borderRadius: "50%",
            background: "#ef4444", border: "2px solid var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff",
          }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

    </div>
  );
}
