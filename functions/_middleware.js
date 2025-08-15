// functions/_middleware.js
export async function onRequest(context) {
const { request, next, env } = context;

// Only process HTML requests to the root
if (request.url.endsWith('/') || request.url.includes('index.html')) {
const response = await next();

```
if (response.headers.get('content-type')?.includes('text/html')) {
  let html = await response.text();
  
  // Inject the Spotify Client ID into the HTML
  const configScript = `
    <script>
      window.SPOTIFY_CONFIG = {
        clientId: '${env.SPOTIFY_CLIENT_ID || ''}'
      };
    </script>
  ';
  
  html = html.replace('</head>', `${configScript}</head>`);
  
  return new Response(html, {
    headers: response.headers
  });
}
```

}

return next();
}
