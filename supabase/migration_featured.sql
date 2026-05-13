-- ── Publicaciones destacadas ─────────────────────────────────────────────────

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured       boolean     DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_until timestamptz;           -- expira automáticamente

-- Index para ordenar destacados primero
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured DESC, created_at DESC);
