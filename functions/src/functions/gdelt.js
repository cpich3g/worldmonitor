const { app } = require('@azure/functions');

app.http('gdelt', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'gdelt/{*path}',
  handler: async (request, context) => {
    const path = request.params.path || '';
    const queryString = new URL(request.url).search;

    try {
      const url = `https://api.gdeltproject.org/${path}${queryString}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.text();
      return {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
        body: data,
      };
    } catch (error) {
      context.log('Error fetching GDELT:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
