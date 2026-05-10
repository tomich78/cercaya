import { supabase } from "./supabase";

export interface LocalProduct {
  id: number;
  emoji: string;
  title: string;
  price: string;
  location: string;
  distance: string;
  bg: string;
  verified: boolean;
  category: string;
  description: string;
  condition?: "Nuevo" | "Usado";
  images?: string[];           // URLs públicas en Supabase Storage
  lat?: number;                // Coordenadas del producto
  lng?: number;
  sold?: boolean;              // Marcado como vendido
  sellerId: number;            // 0 para productos de usuarios reales
  userId?: string;             // UUID del usuario que publicó (Supabase)
  createdAt: string;
}

function rowToProduct(row: Record<string, unknown>): LocalProduct {
  return {
    id:          row.id as number,
    emoji:       row.emoji as string,
    title:       row.title as string,
    price:       row.price as string,
    location:    row.location as string,
    distance:    row.distance as string,
    bg:          row.bg as string,
    verified:    row.verified as boolean,
    category:    row.category as string,
    description: row.description as string,
    condition:   row.condition as "Nuevo" | "Usado" | undefined,
    images:      (row.images as string[] | null) ?? [],
    lat:         row.lat as number | undefined,
    lng:         row.lng as number | undefined,
    sold:        (row.sold as boolean) ?? false,
    sellerId:    0,
    userId:      row.user_id as string | undefined,
    createdAt:   row.created_at as string,
  };
}

export async function getLocalProducts(): Promise<LocalProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToProduct);
}

export async function getProductById(id: number): Promise<LocalProduct | null> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return null;
  return rowToProduct(data);
}

export async function saveLocalProduct(
  product: Omit<LocalProduct, "id" | "createdAt" | "sellerId">,
): Promise<LocalProduct> {
  const row = {
    user_id:     product.userId ?? null,
    emoji:       product.emoji,
    title:       product.title,
    price:       product.price,
    location:    product.location,
    distance:    product.distance,
    bg:          product.bg,
    verified:    product.verified,
    category:    product.category,
    description: product.description,
    condition:   product.condition ?? null,
    images:      product.images ?? [],
    lat:         product.lat ?? null,
    lng:         product.lng ?? null,
  };
  const { data, error } = await supabase.from("products").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Error al guardar producto");
  return rowToProduct(data);
}

export async function deleteLocalProduct(id: number): Promise<void> {
  await supabase.from("products").delete().eq("id", id);
}

export async function updateProduct(
  id: number,
  updates: Partial<{
    sold: boolean;
    title: string;
    price: string;
    description: string;
    category: string;
    emoji: string;
    bg: string;
    condition: "Nuevo" | "Usado";
    location: string;
    images: string[];
    lat: number | null;
    lng: number | null;
  }>,
): Promise<void> {
  // Map JS field names → DB column names where they differ
  const row: Record<string, unknown> = { ...updates };
  await supabase.from("products").update(row).eq("id", id);
}

// ── Imágenes ──────────────────────────────────────────────────

export async function uploadProductImages(
  userId: string,
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 5)) {
    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path     = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (!error) {
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}
