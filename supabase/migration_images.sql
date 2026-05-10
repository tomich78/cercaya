-- Agregar columna de imágenes a productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Crear bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT DO NOTHING;

-- Política: cualquiera puede ver las imágenes (bucket público)
CREATE POLICY "Product images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Política: solo usuarios autenticados pueden subir (en su propia carpeta)
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: cada usuario puede borrar solo sus propias imágenes
CREATE POLICY "Users can delete their own product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
