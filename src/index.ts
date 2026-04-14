export interface Env {
  CLAWPPY_KV: KVNamespace;
  OPENCODE_API_KEY: string;
  META_ACCESS_TOKEN?: string;
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

    // Meta Webhook Verification (GET request)
    if (request.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === "clawppy") {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Verification failed", { status: 403 });
    }

    // Meta Webhook Message Handling (POST request)
    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleMetaWebhook(request, env);
    }
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Clawppy is running! Use /webhook for WhatsApp messages.", { status: 200 });
  }
};

async function handleMetaWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const body: any = await request.json();

    // Check if it's a message event
    if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const messageData = body.entry[0].changes[0].value.messages[0];
      const contactData = body.entry[0].changes[0].value.contacts[0];
      
      let message = "";
      if (messageData.type === "text") {
        message = messageData.text.body;
      } else if (messageData.type === "interactive") {
        if (messageData.interactive.type === "button_reply") {
          message = messageData.interactive.button_reply.title; // Use button title as the message
        } else if (messageData.interactive.type === "list_reply") {
          message = messageData.interactive.list_reply.title;
        }
      }
      
      const from = messageData.from; // Phone number
      const profileName = contactData.profile?.name || "Student";
      const businessPhoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;

      if (message && from) {
        // Process the message using our existing logic
        const response: string | MetaInteractiveMessage = await processMessage(message, from, profileName, env);
        
        // Send the response back via Meta API
        if (typeof response === "string") {
          await sendMetaMessage(response, from, businessPhoneNumberId, env);
        } else {
          await sendMetaInteractive(response, from, businessPhoneNumberId, env);
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error handling Meta webhook:", error);
    return new Response("Error", { status: 500 });
  }
}

async function sendMetaMessage(text: string, to: string, phoneId: string, env: Env) {
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.META_ACCESS_TOKEN || env.OPENCODE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: text }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Meta API send error:", error);
  }
}

async function sendMetaInteractive(interactive: any, to: string, phoneId: string, env: Env) {
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.META_ACCESS_TOKEN || env.OPENCODE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "interactive",
      interactive: interactive
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Meta API interactive send error:", error);
  }
}

import { processMessage } from "./handlers/message";
import { MetaInteractiveMessage } from "./types";