// functions/test.js
export async function onRequest() {
  return new Response("Functions are working!", {
    headers: { "Content-Type": "text/plain" }
  });
}
