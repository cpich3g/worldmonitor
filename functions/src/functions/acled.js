const { app } = require('@azure/functions');

app.http('acled', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'acled/{*path}',
  handler: async (request, context) => {
    const email = process.env.ACLED_EMAIL;
    const key = process.env.ACLED_PASSWORD;

    if (!email || !key) {
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'ACLED API not configured' },
      };
    }

    const path = request.params.path || '';
    const queryString = new URL(request.url).search.slice(1);

    try {
      const url = `https://api.acleddata.com/${path}?${queryString}&email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.text();
      return {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
        body: data,
      };
    } catch (error) {
      context.log('Error fetching ACLED:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
