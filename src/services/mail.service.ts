import { Resend } from "resend";
import { config } from "../config";
import type { ContactInput } from "../schemas/contact.schema";

const resend = new Resend(config.resend.apiKey);

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
  const message = escapeHtml(data.message).replace(/\n/g, "<br>");

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
      <h2>New contact form message</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>

      <p><strong>Message:</strong></p>
      <p>${message}</p>
    </div>
  `;
}

export async function sendContactEmail(
  data: ContactInput,
): Promise<void> {
  const { data: result, error } = await resend.emails.send({
    from: config.resend.from,
    to: config.contactEmail,
    replyTo: data.email,
    subject: `New contact form message from ${data.name}`,
    text: buildTextBody(data),
    html: buildHtmlBody(data),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log("Email sent:", result?.id);
}