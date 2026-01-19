const { app } = require('@azure/functions');

app.http('opensky', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'opensky/{*path}',
  handler: async (request, context) => {
    const path = request.params.path || '';
    const queryString = new URL(request.url).search;

    try {
      const url = `https://opensky-network.org/api/${path}${queryString}`;
      const response = await fetch(url, {
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
      context.log('Error fetching OpenSky:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
