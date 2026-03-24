import nodemailer from "nodemailer";
import Setting from "../models/Setting.js";

/**
 * Creates a nodemailer transporter using the latest SMTP settings from the database.
 */
export const getTransporter = async () => {
  const doc = await Setting.findOne({ key: "global" }).lean();
  const emailSettings = doc?.data?.email || {};

  // Default values compatible with Hostinger if not fully specified
  const host = emailSettings.smtpHost || "smtp.hostinger.com";
  const port = parseInt(emailSettings.smtpPort) || 465;
  const user = emailSettings.smtpUser || "";
  const pass = emailSettings.smtpPass || "";
  const secure = port === 465;

  if (!user || !pass) {
    throw new Error("SMTP credentials (user/password) are not configured in settings.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Often needed for shared hosting environments
    },
  });
};

/**
 * Sends an email using the configured SMTP settings.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await getTransporter();
    const doc = await Setting.findOne({ key: "global" }).lean();
    const fromName = doc?.data?.general?.companyName || "Tech Company CRM";
    const fromEmail = doc?.data?.email?.smtpUser || "";

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    throw error;
  }
};
