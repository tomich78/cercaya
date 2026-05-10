-- ── DNI verification upgrade ─────────────────────────────────────────────────
-- Agrega dni_status y dni_doc_url a la tabla profiles.
-- dni_status: 'none' | 'pending' | 'approved' | 'rejected'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dni_status  text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dni_doc_url text;

-- Bucket privado para documentos de identidad (no público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dni-docs', 'dni-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Los usuarios solo pueden subir a su propia carpeta (uid como primer segmento del path)
CREATE POLICY "Users upload own DNI doc"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dni-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Los usuarios pueden leer su propio documento
CREATE POLICY "Users read own DNI doc"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dni-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- (Opcional) Actualizar el existente dni_verified cuando se apruebe manualmente:
-- UPDATE profiles SET dni_verified = true WHERE dni_status = 'approved';
