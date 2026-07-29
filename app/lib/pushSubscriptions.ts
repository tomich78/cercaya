import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

/** Convierte una base64url string a Uint8Array (necesario para subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/** Pide permiso y suscribe al usuario a push notifications.
 *  Guarda la suscripción en Supabase.
 *  Retorna "granted" | "denied" | "unsupported"
 */
export async function subscribeToPush(userId: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  // Pedir permiso
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  // Obtener el service worker registrado
  const reg = await navigator.serviceWorker.ready;

  // Suscribirse con la clave pública VAPID
  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  } catch {
    return "denied";
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const p256dh   = json.keys?.p256dh!;
  const auth     = json.keys?.auth!;

  // Guardar en Supabase (upsert por endpoint para no duplicar)
  await supabase
    .from("push_subscriptions")
    .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "user_id,endpoint" });

  return "granted";
}

/** Devuelve el estado actual del permiso de notificaciones */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
