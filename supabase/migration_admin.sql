-- ── Funciones de administración (bypasean RLS con SECURITY DEFINER) ───────────
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- ── Aprobar DNI ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_approve_dni(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET dni_status   = 'approved',
      dni_verified = true
  WHERE id = target_user_id;
END;
$$;

-- ── Rechazar DNI ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_reject_dni(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET dni_status = 'rejected'
  WHERE id = target_user_id;
END;
$$;

-- ── Quitar destacado ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_unfeature_product(product_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET featured       = false,
      featured_until = null
  WHERE id = product_id;
END;
$$;

-- Dar acceso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION admin_approve_dni(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_dni(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unfeature_product(bigint) TO authenticated;
