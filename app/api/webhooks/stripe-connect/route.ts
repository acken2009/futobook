import { NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  markEventAsProcessed,
  handlePaymentIntentSucceeded,
  handleCustomerSubscriptionCreated,
  handleCustomerSubscriptionUpdated,
} from "@/lib/stripe/webhooks";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const connectedAccountId = request.headers.get("stripe-account") ?? "";

  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error("STRIPE_CONNECT_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event;
  try {
    event = await verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Connect Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Connect EventはアカウントIDを付与してユニーク性を確保
  const uniqueEventId = `${connectedAccountId}_${event.id}`;
  const isNew = await markEventAsProcessed(uniqueEventId, event.type);
  if (!isNew) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as any,
          connectedAccountId
        );
        break;
      case "customer.subscription.created":
        await handleCustomerSubscriptionCreated(event.data.object as any);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionUpdated(event.data.object as any);
        break;
      default:
        console.warn(`Unhandled connect event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing connect event ${event.type}:`, err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
