import { supabase } from "./supabase";

export interface Review {
  id: number;
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerInitials: string;
  rating: number;
  text: string;
  createdAt: string;
}

function rowToReview(row: Record<string, unknown>): Review {
  return {
    id:               row.id as number,
    sellerId:         row.seller_id as string,
    reviewerId:       row.reviewer_id as string,
    reviewerName:     row.reviewer_name as string,
    reviewerInitials: row.reviewer_initials as string,
    rating:           row.rating as number,
    text:             row.text as string,
    createdAt:        row.created_at as string,
  };
}

export async function getReviewsForSeller(sellerId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToReview);
}

export async function hasReviewed(reviewerId: string, sellerId: string): Promise<boolean> {
  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewer_id", reviewerId)
    .eq("seller_id", sellerId);
  return (count ?? 0) > 0;
}

export async function addReview(data: Omit<Review, "id" | "createdAt">): Promise<Review> {
  const { data: row, error } = await supabase
    .from("reviews")
    .insert({
      seller_id:         data.sellerId,
      reviewer_id:       data.reviewerId,
      reviewer_name:     data.reviewerName,
      reviewer_initials: data.reviewerInitials,
      rating:            data.rating,
      text:              data.text,
    })
    .select()
    .single();
  if (error || !row) throw new Error(error?.message ?? "Error al guardar reseña");
  return rowToReview(row);
}

export async function calcStats(
  sellerId: string,
  seedRatings: number[] = [],
): Promise<{ rating: number; count: number }> {
  const reviews = await getReviewsForSeller(sellerId);
  const all = [...seedRatings, ...reviews.map(r => r.rating)];
  if (!all.length) return { rating: 0, count: 0 };
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  return { rating: Math.round(avg * 10) / 10, count: all.length };
}
