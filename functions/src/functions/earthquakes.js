const { app } = require('@azure/functions');

app.http('earthquakes', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'earthquakes',
  handler: async (request, context) => {
    try {
      const response = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
        { headers: { 'Accept': 'application/json' } }
      );
      
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
      context.log('Error fetching earthquakes:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
