-- ── Lecturas de conversaciones (para badge de no leídos) ─────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id bigint      NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- RLS
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

-- Sólo el propio usuario puede ver / escribir sus lecturas
CREATE POLICY "reads_select" ON public.conversation_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reads_upsert" ON public.conversation_reads
  FOR ALL USING (auth.uid() = user_id);

-- ── Alertas de búsqueda guardada ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.search_alerts (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query      text        NOT NULL,           -- término de búsqueda
  category   text,                           -- filtro de categoría (opcional)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, query, category)          -- evitar duplicados
);

ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_own" ON public.search_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Activar Realtime en messages para el badge en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
