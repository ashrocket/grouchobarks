// functions/_middleware.js
export async function onRequest(context) {
const { request, next, env } = context;

// Only process HTML requests to the root path
const url = new URL(request.url);
if (url.pathname === ‘/’ && request.method === ‘GET’) {
const response = await next();

```
// Check if this is an HTML response
const contentType = response.headers.get('content-type');
if (contentType && contentType.includes('text/html')) {
  let html = await response.text();
  
  // Inject the Spotify Client ID into the HTML
  const configScript = `
    <script>
      window.SPOTIFY_CONFIG = {
        clientId: "${env.SPOTIFY_CLIENT_ID || ""}"
      };
    </script>`;
  
  // Insert before existing scripts
  html = html.replace('<!-- Spotify Configuration -->', configScript);
  
  return new Response(html, {
    headers: response.headers
  });
}
```

}

// For all other requests, just pass through
return next();
}