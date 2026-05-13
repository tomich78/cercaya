-- ── Perfil de negocio ────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_business        boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_category  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_hours     text;   -- ej: "Lun–Vie 9–18 h"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_desc      text;

-- ── Verificación de negocio (CUIT + pago) ────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_paid      boolean DEFAULT false;  -- pagó la suscripción
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_cuit      text;                   -- CUIT ingresado
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_cuit_verified boolean DEFAULT false; -- checksum válido
