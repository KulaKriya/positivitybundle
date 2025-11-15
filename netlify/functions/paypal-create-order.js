// Creates a PayPal order for either $29 (base) or $39 (bundle) based on 'amount' in request body
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_SUCCESS_URL } = process.env;
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET || !PAYPAL_SUCCESS_URL) {
      return { statusCode: 500, body: JSON.stringify({ error: 'PayPal env vars missing' }) };
    }

    const { utm, amount, product } = JSON.parse(event.body || '{}');
    const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    // Get OAuth token
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error('Missing access token');

    // Create order at requested amount (29 or 39)
    const amt = (typeof amount === 'number' && amount > 0) ? amount.toFixed(2) : '29.00';
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amt },
          custom_id: (utm || '').slice(0, 127),
          description: product || 'POSITIVITY'
        }],
        application_context: {
          return_url: PAYPAL_SUCCESS_URL,
          cancel_url: PAYPAL_SUCCESS_URL.replace('/thank-you','/') + '?canceled=1'
        }
      })
    });

    const order = await orderRes.json();
    return { statusCode: 200, body: JSON.stringify({ id: order.id }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'PayPal create error' }) };
  }
};
