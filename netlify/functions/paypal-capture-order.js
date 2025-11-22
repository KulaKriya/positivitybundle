// Captures a PayPal order and redirects to thank-you with amount/currency
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_SUCCESS_URL } = process.env;
    const { orderID } = JSON.parse(event.body || '{}');
    if (!orderID) return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderID' }) };

    const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error('Missing access token');

    const capRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }
    });
    const cap = await capRes.json();

    const amount = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '29.00';
    const currency = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'USD';
    const product = cap?.purchase_units?.[0]?.description || 'POSITIVITY';

    const redirect = `${PAYPAL_SUCCESS_URL}&product=${encodeURIComponent(product)}&amount=${encodeURIComponent(amount)}&currency=${encodeURIComponent(currency)}&order_id=${encodeURIComponent(orderID)}`;
    return { statusCode: 200, body: JSON.stringify({ redirect }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'PayPal capture error' }) };
  }
};
