import { supabase } from "./supabase";

export type DniStatus = "none" | "pending" | "approved" | "rejected";

export interface LocalUser {
  id: string;             // UUID de Supabase Auth
  name: string;
  email: string;
  initials: string;
  location: string;
  lat?: number;           // Coordenadas de la ubicación del usuario
  lng?: number;
  avatarUrl?: string;     // URL pública de la foto de perfil
  phoneVerified: boolean;
  phoneNumber?: string;
  dniVerified: boolean;   // true cuando dniStatus === "approved"
  dniNumber?: string;
  dniStatus: DniStatus;   // estado real del proceso de verificación
  dniDocUrl?: string;     // path del doc subido en Supabase Storage
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rowToUser(profile: Record<string, unknown>, email: string): LocalUser {
  const dniStatus = (profile.dni_status as DniStatus | null) ?? "none";
  return {
    id:            profile.id as string,
    name:          profile.name as string,
    email,
    initials:      profile.initials as string,
    location:      (profile.location as string) ?? "",
    lat:           profile.lat as number | undefined,
    lng:           profile.lng as number | undefined,
    avatarUrl:     profile.avatar_url as string | undefined,
    phoneVerified: profile.phone_verified as boolean,
    phoneNumber:   profile.phone_number as string | undefined,
    dniVerified:   dniStatus === "approved",
    dniNumber:     profile.dni_number as string | undefined,
    dniStatus,
    dniDocUrl:     profile.dni_doc_url as string | undefined,
    createdAt:     profile.created_at as string,
  };
}

// ── Helpers de error ─────────────────────────────────────────

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("email not confirmed"))
    return "Necesitás confirmar tu email antes de ingresar. Revisá tu bandeja de entrada (y la carpeta de spam).";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Email o contraseña incorrectos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con ese email. Podés iniciar sesión directamente.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email address") || m.includes("invalid email"))
    return "El email ingresado no es válido.";
  if (m.includes("email rate limit") || m.includes("too many requests"))
    return "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo.";
  if (m.includes("network") || m.includes("fetch"))
    return "Error de conexión. Verificá tu internet e intentá de nuevo.";
  // Fallback: mostrar el error original en dev, mensaje genérico en prod
  return process.env.NODE_ENV === "development"
    ? `Error: ${msg}`
    : "Ocurrió un error inesperado. Intentá de nuevo.";
}

// ── Auth ─────────────────────────────────────────────────────

export async function register(
  name: string,
  email: string,
  password: string,
  location: string,
): Promise<{ user: LocalUser | null; error: string | null }> {
  const initials = makeInitials(name);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim(), initials, location: location.trim() } },
  });
  if (error) return { user: null, error: friendlyAuthError(error.message) };
  if (!data.user) return { user: null, error: "No se pudo crear el usuario." };

  // El trigger crea el perfil automáticamente; esperamos un momento
  await new Promise(r => setTimeout(r, 500));
  const user = await getCurrentUser();
  return { user, error: null };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: LocalUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { user: null, error: friendlyAuthError(error.message) };
  if (!data.user) return { user: null, error: "No se pudo iniciar sesión." };

  const user = await getCurrentUser();
  return { user, error: null };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;
  return rowToUser(profile, authUser.email ?? "");
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;
  await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Añadir timestamp para forzar recarga en el browser
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function updateUser(
  userId: string,
  updates: Partial<{
    name: string;
    phoneVerified: boolean;
    phoneNumber: string;
    dniVerified: boolean;
    dniNumber: string;
    dniStatus: DniStatus;
    dniDocUrl: string;
    location: string;
    lat: number;
    lng: number;
    avatarUrl: string;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.phoneVerified !== undefined) row.phone_verified = updates.phoneVerified;
  if (updates.phoneNumber   !== undefined) row.phone_number   = updates.phoneNumber;
  if (updates.dniVerified   !== undefined) row.dni_verified   = updates.dniVerified;
  if (updates.dniNumber     !== undefined) row.dni_number     = updates.dniNumber;
  if (updates.dniStatus     !== undefined) row.dni_status     = updates.dniStatus;
  if (updates.dniDocUrl     !== undefined) row.dni_doc_url    = updates.dniDocUrl;
  if (updates.location      !== undefined) row.location       = updates.location;
  if (updates.lat           !== undefined) row.lat            = updates.lat;
  if (updates.lng           !== undefined) row.lng            = updates.lng;
  if (updates.name          !== undefined) row.name           = updates.name;
  if (updates.avatarUrl     !== undefined) row.avatar_url     = updates.avatarUrl;
  await supabase.from("profiles").update(row).eq("id", userId);
}

// ── DNI document upload ───────────────────────────────────────

export async function uploadDniDoc(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/frente.${ext}`;

  // Upsert: reemplaza si ya existía un intento previo
  const { error } = await supabase.storage
    .from("dni-docs")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw new Error(error.message);
  return path; // guardamos el path (no la URL pública — el bucket es privado)
}
