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
  // Perfil de negocio
  isBusiness: boolean;
  businessPaid: boolean;          // pagó la suscripción
  businessName?: string;
  businessCategory?: string;
  businessHours?: string;
  businessDesc?: string;
  businessCuit?: string;          // CUIT ingresado
  businessCuitVerified: boolean;  // checksum válido
  businessSlug?: string;          // URL pública: /negocio/[slug]
  businessCoverUrl?: string;      // imagen de portada de la página del negocio
  businessAddress?: string;       // dirección física del negocio
  // Mercado Pago
  mpLinked: boolean;              // tiene cuenta MP vinculada
  mpUserId?: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Nombre a mostrar públicamente: si el usuario tiene perfil de negocio activo
 * y cargó un nombre de negocio, se usa ese; si no, el nombre personal.
 */
export function getDisplayName(
  user: Pick<LocalUser, "isBusiness" | "businessName" | "name">,
): string {
  return user.isBusiness && user.businessName ? user.businessName : user.name;
}

/**
 * Valida el CUIT/CUIL argentino usando el algoritmo oficial del dígito verificador.
 * Acepta formatos: "20-12345678-9" o "20123456789"
 * Retorna true si es válido.
 */
export function validateCuit(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;

  let expected: number;
  if (remainder === 0)      expected = 0;
  else if (remainder === 1) return false; // CUIT inválido por definición
  else                      expected = 11 - remainder;

  return expected === Number(digits[10]);
}

/**
 * Formatea un CUIT limpio a XX-XXXXXXXX-X
 */
export function formatCuit(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rowToUser(profile: Record<string, unknown>, email: string): LocalUser {
  const dniStatus = (profile.dni_status as DniStatus | null) ?? "none";
  return {
    id:                   profile.id as string,
    name:                 profile.name as string,
    email,
    initials:             profile.initials as string,
    location:             (profile.location as string) ?? "",
    lat:                  profile.lat as number | undefined,
    lng:                  profile.lng as number | undefined,
    avatarUrl:            profile.avatar_url as string | undefined,
    phoneVerified:        profile.phone_verified as boolean,
    phoneNumber:          profile.phone_number as string | undefined,
    dniVerified:          dniStatus === "approved",
    dniNumber:            profile.dni_number as string | undefined,
    dniStatus,
    dniDocUrl:            profile.dni_doc_url as string | undefined,
    isBusiness:           (profile.is_business as boolean) ?? false,
    businessPaid:         (profile.business_paid as boolean) ?? false,
    businessName:         profile.business_name as string | undefined,
    businessCategory:     profile.business_category as string | undefined,
    businessHours:        profile.business_hours as string | undefined,
    businessDesc:         profile.business_desc as string | undefined,
    businessCuit:         profile.business_cuit as string | undefined,
    businessCuitVerified: (profile.business_cuit_verified as boolean) ?? false,
    businessSlug:         profile.business_slug as string | undefined,
    businessCoverUrl:     profile.business_cover_url as string | undefined,
    businessAddress:      profile.business_address as string | undefined,
    mpLinked:             !!(profile.mp_access_token as string | null),
    mpUserId:             profile.mp_user_id as number | undefined,
    createdAt:            profile.created_at as string,
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
  return process.env.NODE_ENV === "development"
    ? `Error: ${msg}`
    : "Ocurrió un error inesperado. Intentá de nuevo.";
}

// ── Auth ─────────────────────────────────────────────────────

export async function resetPasswordForEmail(
  email: string,
): Promise<{ error: string | null }> {
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  );
  if (error) return { error: `[debug] ${error.message}` };
  return { error: null };
}

export async function updatePassword(
  newPassword: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: friendlyAuthError(error.message) };
  return { error: null };
}

export async function loginWithGoogle(redirectTo = "/"): Promise<void> {
  const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });
}

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
  clearUserCache();
  await supabase.auth.signOut();
}

// ── Caché en memoria del usuario actual ──────────────────────
let _userCache: LocalUser | null = null;
let _userCacheAt = 0;
const USER_CACHE_TTL = 60_000; // 1 minuto

export function clearUserCache(): void {
  _userCache = null;
  _userCacheAt = 0;
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  if (_userCache && Date.now() - _userCacheAt < USER_CACHE_TTL) return _userCache;

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) { _userCache = null; return null; }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) { _userCache = null; return null; }
  _userCache = rowToUser(profile, authUser.email ?? "");
  _userCacheAt = Date.now();
  return _userCache;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;
  await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
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
    isBusiness: boolean;
    businessPaid: boolean;
    businessName: string;
    businessCategory: string;
    businessHours: string;
    businessDesc: string;
    businessCuit: string;
    businessCuitVerified: boolean;
    businessSlug: string;
    businessCoverUrl: string;
    businessAddress: string;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.phoneVerified        !== undefined) row.phone_verified          = updates.phoneVerified;
  if (updates.phoneNumber          !== undefined) row.phone_number            = updates.phoneNumber;
  if (updates.dniVerified          !== undefined) row.dni_verified            = updates.dniVerified;
  if (updates.dniNumber            !== undefined) row.dni_number              = updates.dniNumber;
  if (updates.dniStatus            !== undefined) row.dni_status              = updates.dniStatus;
  if (updates.dniDocUrl            !== undefined) row.dni_doc_url             = updates.dniDocUrl;
  if (updates.location             !== undefined) row.location                = updates.location;
  if (updates.lat                  !== undefined) row.lat                     = updates.lat;
  if (updates.lng                  !== undefined) row.lng                     = updates.lng;
  if (updates.name                 !== undefined) row.name                    = updates.name;
  if (updates.avatarUrl            !== undefined) row.avatar_url              = updates.avatarUrl;
  if (updates.isBusiness           !== undefined) row.is_business             = updates.isBusiness;
  if (updates.businessPaid         !== undefined) row.business_paid           = updates.businessPaid;
  if (updates.businessName         !== undefined) row.business_name           = updates.businessName;
  if (updates.businessCategory     !== undefined) row.business_category       = updates.businessCategory;
  if (updates.businessHours        !== undefined) row.business_hours          = updates.businessHours;
  if (updates.businessDesc         !== undefined) row.business_desc           = updates.businessDesc;
  if (updates.businessCuit         !== undefined) row.business_cuit           = updates.businessCuit;
  if (updates.businessCuitVerified !== undefined) row.business_cuit_verified  = updates.businessCuitVerified;
  if (updates.businessSlug        !== undefined) row.business_slug           = updates.businessSlug;
  if (updates.businessCoverUrl    !== undefined) row.business_cover_url      = updates.businessCoverUrl;
  if (updates.businessAddress     !== undefined) row.business_address        = updates.businessAddress;
  await supabase.from("profiles").update(row).eq("id", userId);
  clearUserCache(); // invalidar caché tras actualizar perfil
}

// ── Business cover upload ─────────────────────────────────────

export async function uploadBusinessCover(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/cover.${ext}`;
  await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ── DNI document upload ───────────────────────────────────────

export async function uploadDniDoc(userId: string, file: File): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/frente.${ext}`;

  const { error } = await supabase.storage
    .from("dni-docs")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw new Error(error.message);
  return path;
}
