import { supabase } from "./supabase";
import type { ListingType } from "../data";

export type { ListingType };

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
  images?: string[];
  lat?: number;
  lng?: number;
  sold?: boolean;
  featured?: boolean;            // ⭐ publicación destacada
  pinned?: boolean;              // 📌 fijado en la página del negocio
  featuredUntil?: string;        // fecha de expiración del destacado
  views?: number;                // vistas del producto
  negotiable?: boolean;          // precio negociable
  delivery?: "retiro" | "envio" | "ambos";  // forma de entrega
  phone?: string;                // WhatsApp de contacto
  stock?: number;                // unidades disponibles
  listingType?: ListingType;     // tipo de publicación
  attributes?: Record<string, unknown>; // campos específicos del tipo
  expiresAt?: string;            // fecha de vencimiento de la publicación
  sellerId: number;
  userId?: string;
  createdAt: string;
  // Info del vendedor (denormalizada desde profiles)
  sellerIsBusiness?: boolean;
  sellerCuitVerified?: boolean;
  sellerBusinessSlug?: string;
}

function rowToProduct(row: Record<string, unknown>): LocalProduct {
  return {
    id:            row.id as number,
    emoji:         row.emoji as string,
    title:         row.title as string,
    price:         row.price as string,
    location:      row.location as string,
    distance:      row.distance as string,
    bg:            row.bg as string,
    verified:      row.verified as boolean,
    category:      row.category as string,
    description:   row.description as string,
    condition:     row.condition as "Nuevo" | "Usado" | undefined,
    images:        (row.images as string[] | null) ?? [],
    lat:           row.lat as number | undefined,
    lng:           row.lng as number | undefined,
    sold:          (row.sold as boolean) ?? false,
    featured:      (row.featured as boolean) ?? false,
    pinned:        (row.pinned as boolean) ?? false,
    featuredUntil: row.featured_until as string | undefined,
    views:         (row.views as number) ?? 0,
    negotiable:    (row.negotiable as boolean) ?? false,
    delivery:      (row.delivery as "retiro" | "envio" | "ambos") ?? "retiro",
    phone:         row.phone as string | undefined,
    stock:         (row.stock as number) ?? 1,
    listingType:   (row.listing_type as ListingType) ?? "product",
    attributes:    (row.attributes as Record<string, unknown>) ?? {},
    expiresAt:     row.expires_at as string | undefined,
    sellerId:      0,
    userId:        row.user_id as string | undefined,
    createdAt:     row.created_at as string,
  };
}

export async function getLocalProducts(options?: { includeSold?: boolean; includeExpired?: boolean }): Promise<LocalProduct[]> {
  // Join con profiles en una sola query (elimina el segundo round trip)
  let query = supabase
    .from("products")
    .select("*, profiles!user_id (is_business, business_cuit_verified, business_slug)")
    .order("featured",   { ascending: false })
    .order("created_at", { ascending: false })
    .limit(400);

  if (!options?.includeSold) {
    query = query.eq("sold", false);
  }

  if (!options?.includeExpired) {
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(row => {
    const prof = row.profiles as { is_business?: boolean; business_cuit_verified?: boolean; business_slug?: string } | null;
    const product = rowToProduct(row as Record<string, unknown>);
    if (prof) {
      product.sellerIsBusiness   = prof.is_business   ?? false;
      product.sellerCuitVerified = prof.business_cuit_verified ?? false;
      product.sellerBusinessSlug = prof.business_slug;
    }
    return product;
  });
}

// ── Negocios ──────────────────────────────────────────────────

export interface LocalBusiness {
  id: string;                    // = profiles.id (user_id del dueño)
  businessName: string;
  businessSlug: string;
  businessCategory?: string;
  businessDesc?: string;
  location?: string;
  avatarUrl?: string;
  coverUrl?: string;
  cuitVerified: boolean;
  productCount: number;          // publicaciones activas
}

/**
 * Trae todos los negocios activos (is_business + business_paid) junto con
 * la cantidad de publicaciones activas de cada uno, en una sola query.
 */
export async function getBusinesses(): Promise<LocalBusiness[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_name, business_slug, business_category, business_desc, location, avatar_url, business_cover_url, business_cuit_verified, products!user_id (id, sold)")
    .eq("is_business", true)
    .eq("business_paid", true)
    .not("business_slug", "is", null);

  if (error || !data) return [];

  return data.map(row => {
    const prods = (row.products as { sold?: boolean }[] | null) ?? [];
    const productCount = prods.filter(p => !p.sold).length;
    return {
      id:               row.id as string,
      businessName:     (row.business_name as string) || "Negocio",
      businessSlug:     row.business_slug as string,
      businessCategory: row.business_category as string | undefined,
      businessDesc:     row.business_desc as string | undefined,
      location:         row.location as string | undefined,
      avatarUrl:        row.avatar_url as string | undefined,
      coverUrl:         row.business_cover_url as string | undefined,
      cuitVerified:     (row.business_cuit_verified as boolean) ?? false,
      productCount,
    };
  }).sort((a, b) => b.productCount - a.productCount);
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
  product: Omit<LocalProduct, "id" | "createdAt" | "sellerId" | "sellerIsBusiness" | "sellerCuitVerified">,
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
    negotiable:    product.negotiable ?? false,
    delivery:      product.delivery ?? "retiro",
    phone:         product.phone ?? null,
    stock:         product.stock ?? 1,
    listing_type:  product.listingType ?? "product",
    attributes:    product.attributes ?? {},
    expires_at:    new Date(Date.now() + 60 * 86_400_000).toISOString(),
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
    featured: boolean;
    featuredUntil: string | null;
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
    pinned: boolean;
    stock: number;
    attributes: Record<string, unknown>;
    expiresAt: string | null;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.sold          !== undefined) row.sold           = updates.sold;
  if (updates.featured      !== undefined) row.featured       = updates.featured;
  if (updates.featuredUntil !== undefined) row.featured_until = updates.featuredUntil;
  if (updates.title         !== undefined) row.title          = updates.title;
  if (updates.price         !== undefined) row.price          = updates.price;
  if (updates.description   !== undefined) row.description    = updates.description;
  if (updates.category      !== undefined) row.category       = updates.category;
  if (updates.emoji         !== undefined) row.emoji          = updates.emoji;
  if (updates.bg            !== undefined) row.bg             = updates.bg;
  if (updates.condition     !== undefined) row.condition      = updates.condition;
  if (updates.location      !== undefined) row.location       = updates.location;
  if (updates.images        !== undefined) row.images         = updates.images;
  if (updates.lat           !== undefined) row.lat            = updates.lat;
  if (updates.lng           !== undefined) row.lng            = updates.lng;
  if (updates.pinned        !== undefined) row.pinned         = updates.pinned;
  if (updates.stock         !== undefined) row.stock          = updates.stock;
  if (updates.attributes    !== undefined) row.attributes     = updates.attributes;
  if (updates.expiresAt     !== undefined) row.expires_at     = updates.expiresAt;
  await supabase.from("products").update(row).eq("id", id);
}

export async function renewProduct(id: number): Promise<void> {
  const newExpiry = new Date(Date.now() + 60 * 86_400_000).toISOString();
  await supabase.from("products").update({ expires_at: newExpiry }).eq("id", id);
}

// ── Imágenes ──────────────────────────────────────────────────

// ── Estadísticas ──────────────────────────────────────────────

export async function incrementProductViews(productId: number): Promise<void> {
  await supabase.rpc("increment_product_views", { pid: productId });
}

export async function incrementProfileViews(profileId: string): Promise<void> {
  await supabase.rpc("increment_profile_views", { uid: profileId });
}

export interface BusinessStats {
  totalViews:    number;   // suma de views de todos sus productos
  pageViews:     number;   // visitas a la página del negocio
  totalMessages: number;   // conversaciones recibidas como vendedor
  totalSold:     number;   // productos vendidos
  activeListings: number;  // publicaciones activas
  topProduct:    { title: string; views: number } | null;
}

export async function getBusinessStats(userId: string): Promise<BusinessStats> {
  // Productos del vendedor
  const { data: prods } = await supabase
    .from("products")
    .select("title, views, sold")
    .eq("user_id", userId);

  const products_ = prods ?? [];
  const totalViews   = products_.reduce((s, p) => s + ((p.views as number) ?? 0), 0);
  const totalSold    = products_.filter(p => p.sold).length;
  const activeListings = products_.filter(p => !p.sold).length;
  const topRaw       = [...products_].sort((a, b) => ((b.views as number) ?? 0) - ((a.views as number) ?? 0))[0];
  const topProduct   = topRaw ? { title: topRaw.title as string, views: (topRaw.views as number) ?? 0 } : null;

  // Visitas a la página del negocio
  const { data: profile } = await supabase
    .from("profiles")
    .select("page_views")
    .eq("id", userId)
    .single();
  const pageViews = (profile?.page_views as number) ?? 0;

  // Mensajes recibidos como vendedor
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId);
  const totalMessages = count ?? 0;

  return { totalViews, pageViews, totalMessages, totalSold, activeListings, topProduct };
}

export async function uploadProductImages(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 5)) {
    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path     = `${userId}/${filename}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (!error) {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}
