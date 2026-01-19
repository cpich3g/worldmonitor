const { app } = require('@azure/functions');

const ALLOWED_CURRENCIES = ['usd', 'eur', 'gbp', 'jpy', 'cny', 'btc', 'eth'];
const MAX_COIN_IDS = 20;
const COIN_ID_PATTERN = /^[a-z0-9-]+$/;

function validateCoinIds(idsParam) {
  if (!idsParam) return 'bitcoin,ethereum,solana';
  const ids = idsParam.split(',')
    .map(id => id.trim().toLowerCase())
    .filter(id => COIN_ID_PATTERN.test(id) && id.length <= 50)
    .slice(0, MAX_COIN_IDS);
  return ids.length > 0 ? ids.join(',') : 'bitcoin,ethereum,solana';
}

function validateCurrency(val) {
  const currency = (val || 'usd').toLowerCase();
  return ALLOWED_CURRENCIES.includes(currency) ? currency : 'usd';
}

app.http('coingecko', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'coingecko',
  handler: async (request, context) => {
    const ids = validateCoinIds(request.query.get('ids'));
    const vsCurrencies = validateCurrency(request.query.get('vs_currencies'));
    const include24hrChange = request.query.get('include_24hr_change') || 'true';

    try {
      const geckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&include_24hr_change=${include24hrChange}`;
      const response = await fetch(geckoUrl, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.text();
      return {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
        body: data,
      };
    } catch (error) {
      context.log('Error fetching coingecko:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
