import express from 'express';
import nodePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint (before static files)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API proxy helper
async function proxyRequest(targetUrl, res, cacheSeconds = 300) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.text();
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
    });
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}

// ===== API Routes (MUST come before static files) =====
// Express 5/path-to-regexp v8 uses *paramName syntax for wildcards

// Earthquakes - USGS
app.get('/api/earthquakes', async (req, res) => {
  await proxyRequest(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
    res, 300
  );
});

// Yahoo Finance
app.get('/api/yahoo/*path', async (req, res) => {
  await proxyRequest(`https://query1.finance.yahoo.com/${req.params.path}`, res, 60);
});

// CoinGecko
app.get('/api/coingecko/*path', async (req, res) => {
  await proxyRequest(`https://api.coingecko.com/${req.params.path}`, res, 60);
});

// Polymarket
app.get('/api/polymarket/*path', async (req, res) => {
  await proxyRequest(`https://gamma-api.polymarket.com/${req.params.path}`, res, 60);
});

// FAA Status
app.get('/api/faa/*path', async (req, res) => {
  await proxyRequest(`https://nasstatus.faa.gov/${req.params.path}`, res, 300);
});

// OpenSky Network
app.get('/api/opensky/*path', async (req, res) => {
  await proxyRequest(`https://opensky-network.org/api/${req.params.path}`, res, 60);
});

// GDELT
app.get('/api/gdelt/*path', async (req, res) => {
  await proxyRequest(`https://api.gdeltproject.org/${req.params.path}`, res, 300);
});

// GDELT GEO
app.get('/api/gdelt-geo/*path', async (req, res) => {
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';
  await proxyRequest(`https://api.gdeltproject.org/api/v2/geo/geo?${query}`, res, 300);
});

// NGA Warnings
app.get('/api/nga-msi/*path', async (req, res) => {
  await proxyRequest(`https://msi.nga.mil/${req.params.path}`, res, 3600);
});

// Cloudflare Radar (requires API token)
app.get('/api/cloudflare-radar/*path', async (req, res) => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Cloudflare API not configured' });
  }
  try {
    const response = await fetch(`https://api.cloudflare.com/${req.params.path}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.text();
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    });
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// FRED Economic Data (requires API key)
app.get('/api/fred-data', async (req, res) => {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'FRED API not configured' });
  }
  const { series_id, observation_start, observation_end } = req.query;
  let url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=10`;
  if (observation_start) url += `&observation_start=${observation_start}`;
  if (observation_end) url += `&observation_end=${observation_end}`;
  await proxyRequest(url, res, 3600);
});

// Finnhub (requires API key)
app.get('/api/finnhub/*path', async (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Finnhub API not configured' });
  }
  const query = req.url.includes('?') ? `${req.url.split('?')[1]}&token=${apiKey}` : `token=${apiKey}`;
  await proxyRequest(`https://finnhub.io/api/v1/${req.params.path}?${query}`, res, 60);
});

// ACLED (requires API key)
app.get('/api/acled/*path', async (req, res) => {
  const apiKey = process.env.ACLED_ACCESS_TOKEN;
  if (!apiKey) {
    return res.status(503).json({ error: 'ACLED API not configured' });
  }
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';
  await proxyRequest(`https://acleddata.com/${req.params.path}?${query}&key=${apiKey}`, res, 3600);
});

// PizzINT
app.get('/api/pizzint/*path', async (req, res) => {
  await proxyRequest(`https://www.pizzint.watch/api/${req.params.path}`, res, 300);
});

// RSS Proxy - Generic handler for various RSS feeds
const rssTargets = {
  'bbc': 'https://feeds.bbci.co.uk',
  'guardian': 'https://www.theguardian.com',
  'npr': 'https://feeds.npr.org',
  'cnn': 'http://rss.cnn.com',
  'hn': 'https://hnrss.org',
  'arstechnica': 'https://feeds.arstechnica.com',
  'verge': 'https://www.theverge.com',
  'cnbc': 'https://www.cnbc.com',
  'marketwatch': 'https://feeds.marketwatch.com',
  'techcrunch': 'https://techcrunch.com',
  'googlenews': 'https://news.google.com',
};

app.get('/rss/:source/*path', async (req, res) => {
  const { source, path } = req.params;
  const target = rssTargets[source];
  if (!target) {
    return res.status(404).json({ error: 'Unknown RSS source' });
  }
  try {
    const response = await fetch(`${target}/${path}`, {
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
    });
    const data = await response.text();
    res.set({
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    });
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// ===== Static Files (AFTER API routes) =====
app.use(express.static(nodePath.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
}));

// SPA fallback - serve index.html for all other routes
app.get('*path', (req, res) => {
  res.sendFile(nodePath.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`World Monitor server running on port ${PORT}`);
});
