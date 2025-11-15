// netlify/functions/verify-stripe-session.js
// Verifies a Stripe Checkout Session by session_id and returns { paid: boolean, details }
const Stripe = require('stripe');

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const session_id = params.get('session_id');
    if (!session_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
    }
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }) };
    }
    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    const sess = await stripe.checkout.sessions.retrieve(session_id);
    const paid = (sess.payment_status === 'paid') || (sess.status === 'complete');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid,
        payment_status: sess.payment_status,
        status: sess.status,
        amount_total: sess.amount_total,
        currency: sess.currency,
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || 'verify stripe error' }) };
  }
};
