"use client";
import { useEffect, useState } from "react";
import { subscribeToPush, getNotificationPermission } from "./pushSubscriptions";

const ASKED_KEY = "push-permission-asked";

/**
 * Pide permiso de notificaciones una sola vez por dispositivo.
 * Se activa automáticamente cuando el usuario está logueado.
 */
export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    if (!userId) return;

    const current = getNotificationPermission();
    setPermission(current);

    // Si ya está concedido, suscribir silenciosamente (por si cambió el endpoint)
    if (current === "granted") {
      subscribeToPush(userId);
      return;
    }

    // Si ya lo negó, no insistir
    if (current === "denied") return;

    // Si es "default" (nunca preguntado) y no lo preguntamos antes en este browser
    const alreadyAsked = localStorage.getItem(ASKED_KEY);
    if (alreadyAsked) return;

    // Esperar 3 segundos para no interrumpir apenas carga
    const timer = setTimeout(async () => {
      localStorage.setItem(ASKED_KEY, "1");
      const result = await subscribeToPush(userId);
      setPermission(result === "granted" ? "granted" : result === "denied" ? "denied" : "default");
    }, 3000);

    return () => clearTimeout(timer);
  }, [userId]);

  return permission;
}
