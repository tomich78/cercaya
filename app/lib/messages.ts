import { supabase } from "./supabase";

export interface Conversation {
  id: number;
  productId: number;
  productTitle: string;
  productEmoji: string;
  productBg: string;
  buyerId: string;
  buyerName: string;
  buyerInitials: string;
  sellerId: string;
  sellerName: string;
  sellerInitials: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  senderInitials: string;
  text: string;
  createdAt: string;
}

function rowToConv(r: Record<string, unknown>): Conversation {
  return {
    id:              r.id as number,
    productId:       r.product_id as number,
    productTitle:    r.product_title as string,
    productEmoji:    r.product_emoji as string,
    productBg:       r.product_bg as string,
    buyerId:         r.buyer_id as string,
    buyerName:       r.buyer_name as string,
    buyerInitials:   r.buyer_initials as string,
    sellerId:        r.seller_id as string,
    sellerName:      r.seller_name as string,
    sellerInitials:  r.seller_initials as string,
    lastMessage:     r.last_message as string,
    lastMessageAt:   r.last_message_at as string,
    createdAt:       r.created_at as string,
  };
}

function rowToMsg(r: Record<string, unknown>): Message {
  return {
    id:              r.id as number,
    conversationId:  r.conversation_id as number,
    senderId:        r.sender_id as string,
    senderInitials:  r.sender_initials as string,
    text:            r.text as string,
    createdAt:       r.created_at as string,
  };
}

// ── Conversaciones ────────────────────────────────────────────

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  return (data ?? []).map(rowToConv);
}

export async function getConversationById(id: number): Promise<Conversation | null> {
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToConv(data) : null;
}

export async function getOrCreateConversation(
  data: Omit<Conversation, "id" | "lastMessage" | "lastMessageAt" | "createdAt">,
): Promise<Conversation> {
  // Buscar conversación existente
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("product_id", data.productId)
    .eq("buyer_id", data.buyerId)
    .maybeSingle();

  if (existing) return rowToConv(existing);

  // Crear nueva
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      product_id:      data.productId,
      product_title:   data.productTitle,
      product_emoji:   data.productEmoji,
      product_bg:      data.productBg,
      buyer_id:        data.buyerId,
      buyer_name:      data.buyerName,
      buyer_initials:  data.buyerInitials,
      seller_id:       data.sellerId,
      seller_name:     data.sellerName,
      seller_initials: data.sellerInitials,
      last_message:    "",
    })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message ?? "Error al crear conversación");
  return rowToConv(created);
}

// ── Mensajes ──────────────────────────────────────────────────

export async function getMessages(conversationId: number): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToMsg);
}

export async function sendMessage(
  conversationId: number,
  senderId: string,
  senderInitials: string,
  text: string,
): Promise<Message> {
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, sender_initials: senderInitials, text: text.trim() })
    .select()
    .single();

  if (error || !msg) throw new Error(error?.message ?? "Error al enviar mensaje");

  // Actualizar lastMessage en la conversación
  await supabase
    .from("conversations")
    .update({ last_message: text.trim(), last_message_at: msg.created_at })
    .eq("id", conversationId);

  return rowToMsg(msg);
}

// ── Lecturas ──────────────────────────────────────────────────

export async function markConversationRead(convId: number, userId: string): Promise<void> {
  await supabase
    .from("conversation_reads")
    .upsert({ conversation_id: convId, user_id: userId, read_at: new Date().toISOString() });
}

export async function isConversationUnread(conv: Conversation, userId: string): Promise<boolean> {
  if (!conv.lastMessage) return false;
  const { data } = await supabase
    .from("conversation_reads")
    .select("read_at")
    .eq("conversation_id", conv.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return true;
  return conv.lastMessageAt > data.read_at;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const convs = await getUserConversations(userId);
  const checks = await Promise.all(convs.map(c => isConversationUnread(c, userId)));
  return checks.filter(Boolean).length;
}
