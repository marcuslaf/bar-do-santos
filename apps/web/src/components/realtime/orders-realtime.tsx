"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 20_000;

/**
 * Mantém o caderno sincronizado entre os aparelhos da equipe.
 *
 * O banco não usa replicação lógica: o trigger `orders_broadcast_changes`
 * chama `realtime.broadcast_changes('orders:<org_id>', 'INSERT' | 'UPDATE', …)`,
 * então o canal recebe mensagens de **broadcast** (autorizadas pela policy em
 * `realtime.messages`) — não `postgres_changes`.
 *
 * Poll de segurança a cada 20s, já que a cozinha costuma deixar a tela parada.
 */
export function OrdersRealtime({ orgId }: { orgId: string }) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function refreshThrottled() {
      const now = Date.now();
      if (now - lastRefreshAt.current < 400) return;
      lastRefreshAt.current = now;
      router.refresh();
    }

    async function connect() {
      try {
        // Necessário para canais privados: renova o token do Realtime antes de assinar.
        await supabase.realtime.setAuth();
      } catch {
        // Sem token válido o canal privado não conecta; o poll abaixo cobre.
      }

      if (cancelled) return;

      channel = supabase.channel(`orders:${orgId}`, {
        config: { private: true },
      });

      channel
        // O trigger publica via broadcast_changes, não via replicação lógica.
        .on("broadcast", { event: "INSERT" }, refreshThrottled)
        .on("broadcast", { event: "UPDATE" }, refreshThrottled)
        .subscribe();
    }

    void connect();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_INTERVAL_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [orgId, router]);

  return null;
}
