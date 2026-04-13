export interface Env {
  CLAWPPY_KV: KVNamespace;
  OPENCODE_API_KEY: string;
  GEMINI_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleTwilioWebhook(request, env);
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Clawppy is running! Use /webhook for WhatsApp messages.", { status: 200 });
  }
};

async function handleTwilioWebhook(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const message = formData.get("Body")?.toString().trim() || "";
  const from = formData.get("From")?.toString() || "";
  const profileName = formData.get("ProfileName")?.toString() || "Student";

  if (!message || !from) {
    return new Response("Missing message data", { status: 400 });
  }

  const response = await processMessage(message, from, profileName, env);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response)}</Message>
</Response>`;

  return new Response(twiml, {
    headers: { "Content-Type": "application/xml" }
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

import { processMessage } from "./handlers/message";