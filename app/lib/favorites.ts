import { supabase } from "./supabase";

export async function getFavorites(userId: string): Promise<number[]> {
  const { data } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId);
  return (data ?? []).map(r => r.product_id as number);
}

export async function isFavorite(userId: string, productId: number): Promise<boolean> {
  const { count } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("product_id", productId);
  return (count ?? 0) > 0;
}

export async function toggleFavorite(userId: string, productId: number): Promise<boolean> {
  const already = await isFavorite(userId, productId);
  if (already) {
    await supabase.from("favorites").delete().eq("user_id", userId).eq("product_id", productId);
    return false;
  } else {
    await supabase.from("favorites").insert({ user_id: userId, product_id: productId });
    return true;
  }
}
