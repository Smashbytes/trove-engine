import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type SupportNote = Database["public"]["Tables"]["support_notes"]["Row"];

export type TicketCategory =
  | "refund"
  | "complaint"
  | "flag"
  | "cancellation"
  | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export const TICKET_CATEGORIES: Array<{ value: TicketCategory; label: string; hint: string }> = [
  { value: "refund", label: "Refund request", hint: "Money back for a guest or yourself" },
  { value: "complaint", label: "Complaint", hint: "Something went wrong on a booking" },
  { value: "flag", label: "Flag a listing or user", hint: "Report misuse or safety concerns" },
  { value: "cancellation", label: "Cancellation", hint: "Cancel a booking or event" },
  { value: "other", label: "Something else", hint: "Anything that doesn't fit above" },
];

export const TICKET_PRIORITIES: Array<{ value: TicketPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const supportKeys = {
  all: ["support-tickets"] as const,
  mine: (userId: string | undefined) => ["support-tickets", "mine", userId] as const,
  detail: (ticketId: string | undefined) => ["support-tickets", ticketId] as const,
  notes: (ticketId: string | undefined) => ["support-notes", ticketId] as const,
};

export function useMyTickets() {
  const { user } = useAuth();
  return useQuery<SupportTicket[]>({
    queryKey: supportKeys.mine(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .or(`created_by.eq.${user!.id},user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

export function useTicket(ticketId: string | undefined) {
  return useQuery<SupportTicket | null>({
    queryKey: supportKeys.detail(ticketId),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SupportTicket | null;
    },
  });
}

export function useTicketNotes(ticketId: string | undefined) {
  return useQuery<SupportNote[]>({
    queryKey: supportKeys.notes(ticketId),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_notes")
        .select("*")
        .eq("ticket_id", ticketId!)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportNote[];
    },
  });
}

async function uploadAttachments(userId: string, ticketScope: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/${ticketScope}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (error) throw error;
    urls.push(path);
  }
  return urls;
}

export async function signAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("support-attachments")
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  relatedBookingId?: string | null;
  files?: File[];
  // When a host opens a ticket on behalf of a guest, target that guest as the
  // ticket subject (user_id) while the host remains created_by. Defaults to the
  // signed-in user (a host raising their own ticket).
  userId?: string;
}

export function useCreateTicket() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      if (!user) throw new Error("Not signed in");
      const tempScope = `new-${Date.now()}`;
      const attachmentPaths = await uploadAttachments(user.id, tempScope, input.files ?? []);

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          title: input.title.trim(),
          description: input.description.trim() || null,
          category: input.category,
          priority: input.priority,
          status: "open",
          user_id: input.userId ?? user.id,
          created_by: user.id,
          related_booking_id: input.relatedBookingId ?? null,
          attachment_urls: attachmentPaths,
        })
        .select("id, ticket_number")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

interface ReplyTicketInput {
  ticketId: string;
  content: string;
  files?: File[];
}

export function useReplyTicket() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReplyTicketInput) => {
      if (!user) throw new Error("Not signed in");
      const attachmentPaths = await uploadAttachments(user.id, input.ticketId, input.files ?? []);

      const { error } = await supabase.from("support_notes").insert({
        ticket_id: input.ticketId,
        author_id: user.id,
        content: input.content.trim(),
        is_internal: false,
        attachment_urls: attachmentPaths,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.notes(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: supportKeys.detail(vars.ticketId) });
    },
  });
}
