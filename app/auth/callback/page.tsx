"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" || !session) return;
        subscription.unsubscribe();

        // Esperar a que el trigger de Supabase cree el profile
        await new Promise(r => setTimeout(r, 700));

        const { data: profile } = await supabase
          .from("profiles")
          .select("dni_number, location")
          .eq("id", session.user.id)
          .single();

        const needsCompletion = !profile?.dni_number || !profile?.location;
        if (needsCompletion) {
          router.replace(`/completar-perfil?redirect=${encodeURIComponent(redirect)}`);
        } else {
          router.replace(redirect);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, redirect]);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 420, margin: "5rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>Iniciando sesión con Google...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div><Navbar /></div>}>
      <CallbackHandler />
    </Suspense>
  );
}
