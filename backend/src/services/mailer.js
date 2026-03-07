import nodemailer from "nodemailer";
import Setting from "../models/Setting.js";

async function getEmailSettings() {
  const doc = await Setting.findOne({ key: "global" }).lean().catch(() => null);
  const data = doc?.data || {};
  const email = data?.email || {};
  const templates = data?.emailTemplates || {};
  return { email, templates, data };
}

function resolveAppBaseUrl(settingsData) {
  const envBase = String(process.env.FRONTEND_URL || "").trim();
  if (envBase) return envBase.replace(/\/$/, "");

  const domain = String(settingsData?.general?.domain || "").trim();
  if (domain) return domain.replace(/\/$/, "");

  return "";
}

export async function sendMail({ to, subject, html, text }) {
  const { email } = await getEmailSettings();

  const host = String(email?.smtpHost || "").trim();
  const portRaw = email?.smtpPort;
  const port = typeof portRaw === "number" ? portRaw : parseInt(String(portRaw || ""), 10);
  const secure = Boolean(email?.secure);
  const user = String(email?.smtpUser || "").trim();
  const pass = String(email?.smtpPass || "").trim();
  const fromName = String(email?.fromName || "").trim() || "HealthSpire";
  const fromEmail = String(email?.fromEmail || "").trim() || user;
  const replyTo = String(email?.replyTo || "").trim();

  if (!host || !port || !fromEmail) {
    throw new Error("Email settings are not configured");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || undefined,
  });
}

export async function sendPasswordResetEmail({ to, link }) {
  const { templates, data } = await getEmailSettings();
  const base = resolveAppBaseUrl(data);
  const finalLink = link || (base ? `${base}/reset-password` : "");

  const tpl = templates?.resetPassword || {};
  const subject = String(tpl?.subject || "Reset your password");
  const body = String(tpl?.body || "Click here to reset: {{link}}");

  const text = body.replace(/\{\{\s*link\s*\}\}/g, finalLink);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
  <p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  <p><a href="${finalLink}">Reset password</a></p>
</div>`;

  await sendMail({ to, subject, text, html });
}
