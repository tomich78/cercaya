import { supabase } from "./supabase";

export interface SearchAlert {
  id: number;
  userId: string;
  query: string;
  category: string | null;
  createdAt: string;
}

function rowToAlert(r: Record<string, unknown>): SearchAlert {
  return {
    id:        r.id as number,
    userId:    r.user_id as string,
    query:     r.query as string,
    category:  r.category as string | null,
    createdAt: r.created_at as string,
  };
}

export async function getUserAlerts(userId: string): Promise<SearchAlert[]> {
  const { data } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToAlert);
}

export async function createAlert(
  userId: string,
  query: string,
  category: string | null,
): Promise<SearchAlert | null> {
  const { data, error } = await supabase
    .from("search_alerts")
    .upsert({ user_id: userId, query: query.trim(), category: category || null })
    .select()
    .single();
  if (error || !data) return null;
  return rowToAlert(data);
}

export async function deleteAlert(id: number): Promise<void> {
  await supabase.from("search_alerts").delete().eq("id", id);
}

/** Devuelve true si ya existe una alerta con exactamente esta query+category */
export async function alertExists(
  userId: string,
  query: string,
  category: string | null,
): Promise<boolean> {
  const { data } = await supabase
    .from("search_alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("query", query.trim())
    .eq("category", category || "")   // null no se puede comparar con eq, usamos ""
    .maybeSingle();
  return !!data;
}
