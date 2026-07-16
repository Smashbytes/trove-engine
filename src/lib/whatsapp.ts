// Connect-WhatsApp client for the Engine. All reads/writes go through the
// whatsapp-connect edge function (service role) so the UI doesn't depend on
// the new host_profiles columns being in the generated types.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface WhatsAppStatus {
  configured: boolean;
  number: string | null;
  verifiedAt: string | null;
}

export interface WhatsAppStart {
  configured: boolean;
  code?: string;
  waLink?: string;
  error?: string;
}

async function invoke<T>(action: "status" | "start" | "disconnect"): Promise<T> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action },
  });
  if (error) {
    // FunctionsHttpError carries the response; surface the server's message.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      const body = await ctx.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  return data as T;
}

export function useWhatsAppStatus(options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ["whatsapp", "status"],
    queryFn: () => invoke<WhatsAppStatus>("status"),
    refetchInterval: options?.poll ? 3000 : false,
    staleTime: 30_000,
  });
}

export function useStartWhatsAppConnect() {
  return useMutation({ mutationFn: () => invoke<WhatsAppStart>("start") });
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke<{ ok: boolean }>("disconnect"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp"] }),
  });
}
