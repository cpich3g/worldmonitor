import express from 'express';
import nodePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Azure Function App URL for API routing
const FUNCTION_APP_URL = process.env.FUNCTION_APP_URL || 'https://wmfunc6185.azurewebsites.net';

// Health check endpoint (before static files)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API proxy helper - routes to Azure Function App or direct URL
async function proxyRequest(targetUrl, res, cacheSeconds = 300, headers = {}) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json', ...headers },
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

// Proxy to Azure Function App
async function proxyToFunctionApp(path, req, res, cacheSeconds = 300) {
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const url = `${FUNCTION_APP_URL}/api/${path}${queryString ? '?' + queryString : ''}`;
  await proxyRequest(url, res, cacheSeconds);
}

// Helper to get path from wildcard params (Express 5 returns array)
function getWildcardPath(params) {
  const path = params.path;
  return Array.isArray(path) ? path.join('/') : (path || '');
}

// ===== API Routes - Routed to Azure Function App =====
// Express 5/path-to-regexp v8 uses *paramName syntax for wildcards

// Earthquakes - routed to Function App
app.get('/api/earthquakes', async (req, res) => {
  await proxyToFunctionApp('earthquakes', req, res, 300);
});

// Yahoo Finance - routed to Function App
app.get('/api/yahoo/*path', async (req, res) => {
  await proxyToFunctionApp(`yahoo/${getWildcardPath(req.params)}`, req, res, 60);
});

// CoinGecko - routed to Function App
app.get('/api/coingecko', async (req, res) => {
  await proxyToFunctionApp('coingecko', req, res, 60);
});
app.get('/api/coingecko/*path', async (req, res) => {
  await proxyToFunctionApp(`coingecko/${getWildcardPath(req.params)}`, req, res, 60);
});

// Polymarket - routed to Function App
app.get('/api/polymarket', async (req, res) => {
  await proxyToFunctionApp('polymarket/markets', req, res, 60);
});
app.get('/api/polymarket/*path', async (req, res) => {
  await proxyToFunctionApp(`polymarket/${getWildcardPath(req.params)}`, req, res, 60);
});

// FAA Status - direct proxy (not in Function App)
app.get('/api/faa/*path', async (req, res) => {
  await proxyRequest(`https://nasstatus.faa.gov/${getWildcardPath(req.params)}`, res, 300);
});

// OpenSky Network - routed to Function App
app.get('/api/opensky/*path', async (req, res) => {
  await proxyToFunctionApp(`opensky/${getWildcardPath(req.params)}`, req, res, 60);
});

// GDELT - routed to Function App
app.get('/api/gdelt/*path', async (req, res) => {
  await proxyToFunctionApp(`gdelt/${getWildcardPath(req.params)}`, req, res, 300);
});

// GDELT DOC API - direct proxy for intelligence queries
app.get('/api/gdelt-doc', async (req, res) => {
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';
  await proxyRequest(`https://api.gdeltproject.org/api/v2/doc/doc?${query}&format=json`, res, 300);
});

// GDELT GEO - direct proxy (specific endpoint)
app.get('/api/gdelt-geo', async (req, res) => {
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';
  await proxyRequest(`https://api.gdeltproject.org/api/v2/geo/geo?${query}`, res, 300);
});
app.get('/api/gdelt-geo/*path', async (req, res) => {
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';
  await proxyRequest(`https://api.gdeltproject.org/api/v2/geo/geo?${query}`, res, 300);
});

// NGA Warnings - direct proxy (not in Function App)
app.get('/api/nga-msi/*path', async (req, res) => {
  await proxyRequest(`https://msi.nga.mil/${getWildcardPath(req.params)}`, res, 3600);
});

// Cloudflare Radar - direct proxy (requires API token from Container App env)
app.get('/api/cloudflare-radar/*path', async (req, res) => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Cloudflare API not configured' });
  }
  await proxyRequest(
    `https://api.cloudflare.com/${getWildcardPath(req.params)}`,
    res, 300,
    { 'Authorization': `Bearer ${token}` }
  );
});

// Cloudflare Outages API (NetBlocks data)
app.get('/api/cloudflare-outages', async (req, res) => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return res.json({ configured: false });
  }
  const dateRange = req.query.dateRange || '7d';
  const limit = req.query.limit || 50;
  await proxyRequest(
    `https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=${dateRange}&limit=${limit}`,
    res, 300,
    { 'Authorization': `Bearer ${token}` }
  );
});

// FRED Economic Data - routed to Function App
app.get('/api/fred-data', async (req, res) => {
  await proxyToFunctionApp('fred-data', req, res, 3600);
});

// Finnhub - routed to Function App
app.get('/api/finnhub', async (req, res) => {
  await proxyToFunctionApp('finnhub', req, res, 60);
});
app.get('/api/finnhub/*path', async (req, res) => {
  await proxyToFunctionApp(`finnhub/${getWildcardPath(req.params)}`, req, res, 60);
});

// ACLED - routed to Function App
app.get('/api/acled', async (req, res) => {
  await proxyToFunctionApp('acled', req, res, 3600);
});
app.get('/api/acled/*path', async (req, res) => {
  await proxyToFunctionApp(`acled/${getWildcardPath(req.params)}`, req, res, 3600);
});

// PizzINT - direct proxy (not in Function App)
app.get('/api/pizzint/*path', async (req, res) => {
  await proxyRequest(`https://www.pizzint.watch/api/${getWildcardPath(req.params)}`, res, 300);
});

// RSS Proxy - URL-based proxy for any RSS feed
app.get('/api/rss-proxy', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WorldMonitor/1.0',
      },
    });
    const data = await response.text();
    res.set({
      'Content-Type': response.headers.get('content-type') || 'application/xml',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    });
    res.status(response.status).send(data);
  } catch (error) {
    console.error('[RSS Proxy] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
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
  const source = req.params.source;
  const path = getWildcardPath(req.params);
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
  console.log(`SENTINEL server running on port ${PORT}`);
});
