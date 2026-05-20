"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { getCurrentUser, type LocalUser } from "../lib/auth";
import { getUserConversations, isConversationUnread, type Conversation } from "../lib/messages";
import { usePageTitle } from "../lib/usePageTitle";
import { supabase } from "../lib/supabase";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MensajesPage() {
  usePageTitle("Mensajes");
  const router = useRouter();
  const [user, setUser]   = useState<LocalUser | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [unreadMap, setUnreadMap] = useState<Map<number, boolean>>(new Map());
  const [ready, setReady] = useState(false);
  const userRef = useRef<LocalUser | null>(null);

  async function loadConversations(u: LocalUser) {
    const conversations = await getUserConversations(u.id);
    setConvs(conversations);
    const map = new Map<number, boolean>();
    await Promise.all(
      conversations.map(async conv => {
        const unread = await isConversationUnread(conv, u.id);
        map.set(conv.id, unread);
      })
    );
    setUnreadMap(map);
  }

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login?redirect=/mensajes"); return; }
      setUser(u);
      userRef.current = u;
      await loadConversations(u);
      setReady(true);
    })();
  }, [router]);

  // Realtime — recarga la lista cuando llega un mensaje nuevo
  useEffect(() => {
    const channel = supabase
      .channel("mensajes-list-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
      }, () => {
        const u = userRef.current;
        if (u) loadConversations(u);
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
      }, () => {
        const u = userRef.current;
        if (u) loadConversations(u);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div className="skeleton" style={{ width: 100, height: 20, borderRadius: 4, marginBottom: 20 }} />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {[1,2,3].map((i, idx) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderBottom: idx < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "40%", height: 13, borderRadius: 3, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 3, marginBottom: 5 }} />
                <div className="skeleton" style={{ width: "80%", height: 12, borderRadius: 3 }} />
              </div>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: -0.4 }}>
          Mensajes
        </h1>

        {convs.length === 0 ? (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "3rem",
            textAlign: "center", color: "var(--text-3)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Sin conversaciones</div>
            <div style={{ fontSize: 12 }}>
              Cuando contactes a un vendedor, la conversación aparece acá.
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {convs.map((conv, i) => {
              const isLast    = i === convs.length - 1;
              const otherName = conv.buyerId === user!.id ? conv.sellerName    : conv.buyerName;
              const otherInit = conv.buyerId === user!.id ? conv.sellerInitials : conv.buyerInitials;
              const unread    = unreadMap.get(conv.id) ?? false;

              return (
                <Link key={conv.id} href={`/mensajes/${conv.id}`}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px",
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "background 0.1s",
                      background: unread ? "var(--green-subtle)" : "transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = unread ? "var(--green-subtle)" : "transparent")}
                  >
                    {/* Product emoji */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 8,
                        background: conv.productBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22,
                      }}>
                        {conv.productEmoji}
                      </div>
                      {unread && (
                        <div style={{
                          position: "absolute", top: -3, right: -3,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#ef4444",
                          border: "2px solid var(--surface)",
                        }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: "var(--text)" }}>
                          {otherName}
                        </div>
                        <div style={{ fontSize: 11, color: unread ? "var(--green)" : "var(--text-3)", flexShrink: 0, marginLeft: 8, fontWeight: unread ? 600 : 400 }}>
                          {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {conv.productTitle}
                      </div>
                      <div style={{ fontSize: 12, color: unread ? "var(--text)" : "var(--text-2)", fontWeight: unread ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {conv.lastMessage || <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Sin mensajes aún</span>}
                      </div>
                    </div>

                    {/* Other person avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--green-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600, color: "var(--green)",
                      flexShrink: 0,
                    }}>
                      {otherInit}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
