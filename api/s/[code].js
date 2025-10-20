export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing code");

    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;
    if (!KV_URL || !KV_TOKEN) {
      return res.status(500).send("KV not configured");
    }

    const resp = await fetch(`${KV_URL}/get/${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const data = await resp.json();
    const longUrl = data.result;

    if (!longUrl) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(`<!doctype html><html><body style="font-family:ui-sans-serif,system-ui">
      <h1>Link not found</h1><p>The code <code>${code}</code> does not exist.</p></body></html>`);
    }

    res.writeHead(301, { Location: longUrl });
    return res.end();
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
