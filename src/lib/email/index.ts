export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface GlobalEmailState {
  sentEmails?: Array<{ to: string; subject: string; html: string }>;
}

const globalEmail = globalThis as unknown as GlobalEmailState;

if (!globalEmail.sentEmails) {
  globalEmail.sentEmails = [];
}

export const sentEmails = globalEmail.sentEmails;

export function clearEmailHistory() {
  if (globalEmail.sentEmails) {
    globalEmail.sentEmails.length = 0;
  }
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || "console";
  const from = process.env.EMAIL_FROM || "NextSaas <noreply@example.com>";

  // 1. Test Mode (saves in memory for playwright assertions)
  if (provider === "test" || process.env.MOCK_DB === "true") {
    sentEmails.push({ to, subject, html });
  }

  // 2. Console Mode (Logs to server logs)
  if (provider === "console" || provider === "test" || process.env.NODE_ENV !== "production") {
    console.log("=========================================");
    console.log(`[EMAIL SENT]`);
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text || "HTML content supplied"}`);
    console.log("=========================================");
  }

  // 3. Resend Provider (Uses native fetch to avoid external SDK dependency conflicts)
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY env variable.");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API sending failed: ${res.status} - ${errText}`);
    }
  }
}
