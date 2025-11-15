// netlify/functions/create-stripe-checkout.js
// Creates a Stripe Checkout Session for POSITIVITY ($29) or BUNDLE_39 ($39) with clear errors.
const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const secret  = process.env.STRIPE_SECRET_KEY;
    const price29 = process.env.STRIPE_PRICE_ID;           // $29 (LIVE)
    const price39 = process.env.STRIPE_PRICE_ID_BUNDLE;    // $39 (LIVE)
    const success = process.env.STRIPE_SUCCESS_URL || "https://positivity.kulakriya.com/thank-you";

    if (!secret)  return { statusCode: 500, body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }) };
    if (!price29) return { statusCode: 500, body: JSON.stringify({ error: "Missing STRIPE_PRICE_ID (29)" }) };

    const body = JSON.parse(event.body || "{}");
    const incoming  = String(body.product || "POSITIVITY").toUpperCase();
    const useBundle = incoming === "BUNDLE_39" || !!body.bump;

    if (useBundle && !price39) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing STRIPE_PRICE_ID_BUNDLE (39)" }) };
    }

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const priceId = useBundle ? price39 : price29;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${success}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: success.replace("/thank-you", "/") + "?canceled=1",
      metadata: { product: useBundle ? "BUNDLE_39" : "POSITIVITY" }
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message || "Stripe session error" })
    };
  }
};
