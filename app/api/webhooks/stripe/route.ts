import { NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  markEventAsProcessed,
  handlePlatformInvoicePaid,
  handlePlatformInvoicePaymentFailed,
  handleAccountUpdated,
  handlePlatformSubscriptionCreated,
} from "@/lib/stripe/webhooks";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = await verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 冪等性チェック
  const isNew = await markEventAsProcessed(event.id, event.type);
  if (!isNew) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await handlePlatformInvoicePaid(event.data.object as any);
        break;
      case "invoice.payment_failed":
        await handlePlatformInvoicePaymentFailed(event.data.object as any);
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object as any);
        break;
      case "customer.subscription.created":
        await handlePlatformSubscriptionCreated(event.data.object as any);
        break;
      default:
        console.log(`Unhandled platform event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing platform event ${event.type}:`, err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
