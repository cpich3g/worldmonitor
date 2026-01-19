const { app } = require('@azure/functions');

app.http('fred', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'fred-data',
  handler: async (request, context) => {
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'FRED API key not configured' },
      };
    }

    const seriesId = request.query.get('series_id');
    if (!seriesId || !/^[A-Z0-9]+$/i.test(seriesId)) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Invalid or missing series_id parameter' },
      };
    }

    try {
      let url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=10`;
      
      const observationStart = request.query.get('observation_start');
      const observationEnd = request.query.get('observation_end');
      if (observationStart) url += `&observation_start=${observationStart}`;
      if (observationEnd) url += `&observation_end=${observationEnd}`;

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
      context.log('Error fetching FRED data:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        jsonBody: { error: 'Failed to fetch data' },
      };
    }
  },
});
