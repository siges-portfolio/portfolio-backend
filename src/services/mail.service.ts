import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config";
import type { ContactInput } from "../schemas/contact.schema";

let transporter: Transporter | null = null;

/**
 * Lazily creates a single reusable SMTP transporter.
 */
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      // Port 465 is implicit TLS, everything else (e.g. 587) uses STARTTLS.
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTextBody(data: ContactInput): string {
  return [
    "New message from the contact form",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}

function buildHtmlBody(data: ContactInput): string {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  // Preserve line breaks from the textarea in the HTML version.
  const message = escapeHtml(data.message).replace(/\n/g, "<br>");

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
      <h2 style="margin-bottom: 16px;">New contact form message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${message}</p>
    </div>
  `;
}

/**
 * Sends the contact form submission to the configured CONTACT_EMAIL.
 * The recipient is always taken from server config — never from user input.
 */
export async function sendContactEmail(data: ContactInput): Promise<void> {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: config.smtp.from,
    to: config.contactEmail,
    replyTo: data.email,
    subject: `New contact form message from ${data.name}`,
    text: buildTextBody(data),
    html: buildHtmlBody(data),
  });
}
