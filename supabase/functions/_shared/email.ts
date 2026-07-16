// Best-effort transactional email via Resend. Never throws — email failure must
// not fail a booking. Set TICKET_FROM_EMAIL to a Resend-verified sender; the
// default onboarding@resend.dev only delivers to the Resend account owner.

export async function sendTicketEmail(opts: {
  to: string | null | undefined;
  spotTitle: string;
  code: string;
  qty: number;
  whenLabel?: string;
}): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("TICKET_FROM_EMAIL") ?? "TROVE <onboarding@resend.dev>";
  if (!key || !opts.to) return;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0612;color:#fff;border-radius:16px">
      <h1 style="font-size:20px;margin:0 0 4px">You're in 🎉</h1>
      <p style="color:#b9b3c7;margin:0 0 16px">Your TROVE ticket for <strong>${escapeHtml(opts.spotTitle)}</strong> is confirmed.</p>
      <div style="background:#fff;color:#0a0612;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b6580">Ticket code</div>
        <div style="font-family:monospace;font-size:24px;letter-spacing:4px;margin-top:4px">${escapeHtml(opts.code)}</div>
      </div>
      <p style="color:#b9b3c7;margin:16px 0 0;font-size:13px">
        ${opts.whenLabel ? escapeHtml(opts.whenLabel) + " · " : ""}${opts.qty} ticket${opts.qty > 1 ? "s" : ""}.
        Show this code at the door.
      </p>
      <p style="color:#6b6580;margin:24px 0 0;font-size:11px">TROVE · Decide. Book. Show up.</p>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: `Your TROVE ticket — ${opts.spotTitle}`,
        html,
      }),
    });
  } catch (_e) {
    // swallow — non-blocking
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
