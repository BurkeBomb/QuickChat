export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing 'url' in body" });
    }

    // Basic URL validation
    let longUrl;
    try {
      longUrl = new URL(url).toString();
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;
    if (!KV_URL || !KV_TOKEN) {
      return res.status(500).json({ error: "KV not configured" });
    }

    // Generate short code
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const makeCode = (len = 7) => Array.from({length: len}, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join("");

    let code = makeCode();
    // Try a few times to avoid collisions
    for (let i = 0; i < 5; i++) {
      // check if exists
      const check = await fetch(`${KV_URL}/exists/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const existsJson = await check.json();
      if (!existsJson.result) break;
      code = makeCode();
    }

    // Save mapping: code -> longUrl
    const save = await fetch(`${KV_URL}/set/${encodeURIComponent(code)}/${encodeURIComponent(longUrl)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const saveJson = await save.json();
    if (save.status >= 400) {
      return res.status(500).json({ error: "KV set failed", details: saveJson });
    }

    const host = process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const shortUrl = `${host.replace(/\/+$/,"")}/s/${code}`;

    return res.status(200).json({ shortUrl, code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
