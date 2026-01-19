const { app } = require('@azure/functions');

const SYMBOL_PATTERN = /^[A-Za-z0-9.^]+$/;
const MAX_SYMBOLS = 20;
const MAX_SYMBOL_LENGTH = 10;

function validateSymbols(symbolsParam) {
  if (!symbolsParam) return null;
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length <= MAX_SYMBOL_LENGTH && SYMBOL_PATTERN.test(s))
    .slice(0, MAX_SYMBOLS);
  return symbols.length > 0 ? symbols : null;
}

async function fetchQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    return { symbol, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  if (data.c === 0 && data.h === 0 && data.l === 0) {
    return { symbol, error: 'No data available' };
  }

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t,
  };
}

app.http('finnhub', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'finnhub',
  handler: async (request, context) => {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Finnhub API key not configured' },
      };
    }

    const symbols = validateSymbols(request.query.get('symbols'));
    if (!symbols) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Invalid or missing symbols parameter' },
      };
    }

    try {
      const quotes = await Promise.all(
        symbols.map(symbol => fetchQuote(symbol, apiKey))
      );

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30',
        },
        jsonBody: { quotes },
      };
    } catch (error) {
      context.log('Error fetching finnhub:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
