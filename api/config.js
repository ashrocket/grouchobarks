// api/config.js - Cloudflare Pages Function to expose environment variables
export async function onRequest(context) {
const { env } = context;

return new Response(JSON.stringify({
spotifyClientId: env.SPOTIFY_CLIENT_ID
}), {
headers: {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET’,
‘Access-Control-Allow-Headers’: ‘Content-Type’
}
});
}
