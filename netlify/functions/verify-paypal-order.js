// netlify/functions/verify-paypal-order.js
// Verifies a PayPal order by order_id and returns { paid: boolean, details }
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const order_id = params.get('order_id');
    if (!order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing order_id' }) };
    }
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret   = process.env.PAYPAL_SECRET;
    const apiBase  = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
    if (!clientId || !secret) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing PayPal credentials' }) };
    }
    // OAuth token
    const basic = Buffer.from(clientId + ':' + secret).toString('base64');
    const tokRes = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tok = await tokRes.json();
    if (!tok.access_token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'PayPal auth failed', detail: tok }) };
    }
    // Get Order
    const ordRes = await fetch(`${apiBase}/v2/checkout/orders/${order_id}`, {
      headers: { 'Authorization': `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' }
    });
    const order = await ordRes.json();
    const paid = (order.status === 'COMPLETED');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid, status: order.status || null, intent: order.intent || null, raw: order })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || 'verify paypal error' }) };
  }
};
