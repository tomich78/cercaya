-- Coordenadas en perfiles de usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lng double precision;

-- Coordenadas en productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lng double precision;
