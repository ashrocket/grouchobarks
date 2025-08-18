// Cloudflare Pages Function for debugging logs
// Auto-deploys to: https://your-site.pages.dev/log

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const logData = await request.json();
    
    // Format log entry for console
    const timestamp = new Date(logData.timestamp).toISOString();
    const browserInfo = `${logData.browser.browser} ${logData.browser.isMobile ? '(mobile)' : '(desktop)'}`;
    
    console.log(`[${timestamp}] ${logData.level.toUpperCase()} [v${logData.version}] [${browserInfo}] ${logData.message}`);
    
    // Log additional data if present
    if (logData.data && Object.keys(logData.data).length > 0) {
      console.log('Data:', JSON.stringify(logData.data, null, 2));
    }
    
    // Store in KV if you want persistent logging (optional)
    // const logKey = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // await env.DEBUG_LOGS.put(logKey, JSON.stringify(logData));
    
    return new Response(JSON.stringify({ status: 'logged' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Logging error:', error);
    return new Response(JSON.stringify({ error: 'Logging failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handle CORS preflight for OPTIONS requests
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}