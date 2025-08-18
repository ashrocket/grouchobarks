// Cloudflare Worker for debugging logs
// Deploy this to: https://grouchobarks-debug.workers.dev/

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method === 'POST' && new URL(request.url).pathname === '/log') {
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

    // Health check endpoint
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('GrouchoBarks Debug Logger', {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};