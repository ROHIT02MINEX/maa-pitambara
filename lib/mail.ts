import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });
  return transporter;
}

/** Minimal HTML escaping for values interpolated into e-mail templates. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Skill Portal</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${esc(title)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</div>
      ${
        cta
          ? `<p style="margin:28px 0 8px;">
               <a href="${esc(cta.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;">${esc(cta.label)}</a>
             </p>
             <p style="margin:12px 0 0;font-size:12px;color:#64748b;word-break:break-all;">Or paste this link into your browser:<br />${esc(cta.url)}</p>`
          : ""
      }
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">
      You received this e-mail because an account exists on the Skill Learning &amp; Assessment Portal.
    </p>
  </div>
</body></html>`;
}

async function send(to: string, subject: string, html: string, text: string) {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM ?? "Skill Portal <no-reply@example.com>";

  if (!t) {
    // No SMTP configured (typical for local development): log the message so
    // the flow remains fully usable instead of silently failing.
    console.warn(
      `[mail] SMTP is not configured, e-mail not sent.\n  to: ${to}\n  subject: ${subject}\n  ${text}`,
    );
    return { delivered: false as const };
  }

  await t.sendMail({ from, to, subject, html, text });
  return { delivered: true as const };
}

export async function sendVerificationEmail(to: string, name: string, url: string) {
  const title = "Confirm your e-mail address";
  const html = layout(
    title,
    `<p>Hi ${esc(name || "there")},</p>
     <p>Thanks for signing up. Please confirm this e-mail address to activate your account. The link is valid for 24 hours.</p>`,
    { label: "Verify e-mail", url },
  );
  return send(to, `${title} | Skill Portal`, html, `Verify your e-mail: ${url}`);
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  const title = "Reset your password";
  const html = layout(
    title,
    `<p>Hi ${esc(name || "there")},</p>
     <p>We received a request to reset your password. This link expires in 1 hour and can be used once.</p>
     <p>If you did not request this, you can safely ignore this e-mail; your password will not change.</p>`,
    { label: "Choose a new password", url },
  );
  return send(to, `${title} | Skill Portal`, html, `Reset your password: ${url}`);
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const title = "Your password was changed";
  const html = layout(
    title,
    `<p>Hi ${esc(name || "there")},</p>
     <p>This is a confirmation that the password for your Skill Portal account was just changed.</p>
     <p>If this wasn't you, reset your password immediately and contact your administrator.</p>`,
  );
  return send(to, `${title} | Skill Portal`, html, "Your Skill Portal password was changed.");
}

export async function sendAdminResetEmail(to: string, name: string, url: string) {
  const title = "An administrator reset your password";
  const html = layout(
    title,
    `<p>Hi ${esc(name || "there")},</p>
     <p>An administrator has issued a password reset for your account. Use the link below to set a new password. It expires in 1 hour.</p>`,
    { label: "Set a new password", url },
  );
  return send(to, `${title} | Skill Portal`, html, `Set a new password: ${url}`);
}
