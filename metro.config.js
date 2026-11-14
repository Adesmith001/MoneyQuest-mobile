process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const http = require('node:http');
const https = require('node:https');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const apiPrefix = '/_moneyquest-api';
const forwardedRequestHeaders = ['accept', 'authorization', 'content-type', 'content-length', 'range'];

function sendApiError(res, status, detail) {
  if (res.headersSent) return res.destroy();
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ detail }));
}

// Expo loads the project environment before starting its development server.
config.server.enhanceMiddleware = middleware => (req, res, next) => {
  if (!req.url?.startsWith(`${apiPrefix}/`)) return middleware(req, res, next);

  const apiUrl = URL.parse(process.env.MONEYQUEST_API_BASE_URL ?? '');
  if (!apiUrl || !['http:', 'https:'].includes(apiUrl.protocol)) {
    return sendApiError(res, 503, 'Set MONEYQUEST_API_BASE_URL to a valid API URL and restart Expo.');
  }

  const client = apiUrl.protocol === 'https:' ? https : http;
  const headers = {};
  for (const name of forwardedRequestHeaders) {
    if (req.headers[name] !== undefined) headers[name] = req.headers[name];
  }

  const upstream = client.request(apiUrl, {
    method: req.method,
    path: apiUrl.pathname.replace(/\/+$/, '') + req.url.slice(apiPrefix.length),
    headers,
  }, response => {
    const headers = { ...response.headers };
    delete headers['set-cookie'];
    delete headers.connection;
    delete headers['transfer-encoding'];
    res.writeHead(response.statusCode, headers);
    response.on('error', () => res.destroy());
    response.pipe(res);
  });

  upstream.setTimeout(15000, () => upstream.destroy());
  upstream.on('error', () => sendApiError(res, 502, 'Expo could not reach the learning API.'));
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
};

// Appwrite 0.13 uses the legacy upload API. Keep one SDK-compatible native
// filesystem while routing only Appwrite's JS import to that supported API.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath.replace(/\\/g, '/');
  if (moduleName === 'expo-file-system' && origin.includes('/react-native-appwrite/')) {
    return context.resolveRequest(context, 'expo-file-system/legacy', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
