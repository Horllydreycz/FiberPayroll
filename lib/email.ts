// Minimal email sender via the Resend HTTP API (no SDK). Set RESEND_API_KEY
// (free at resend.com) and optionally EMAIL_FROM in .env.

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Uint8Array };
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "Email isn't configured — set RESEND_API_KEY in .env (free key at resend.com).",
    };
  }
  const from = process.env.EMAIL_FROM ?? "FiberPayroll <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        attachments: opts.attachment
          ? [
              {
                filename: opts.attachment.filename,
                content: Buffer.from(opts.attachment.content).toString("base64"),
              },
            ]
          : undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Email failed (${res.status}): ${body.slice(0, 140)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
