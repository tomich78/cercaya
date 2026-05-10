import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan variables de entorno de Supabase.\n" +
    "Asegurate de tener el archivo .env.local (sin extensión .txt) en la raíz del proyecto " +
    "con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY, y reiniciá el servidor."
  );
}

export const supabase = createClient(url, key);
