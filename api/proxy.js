export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url, method = "POST", headers = {}, body } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing target URL" });
    }

    const target = new URL(url);

    if (!["http:", "https:"].includes(target.protocol)) {
      return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported" });
    }

    const host = target.hostname.toLowerCase();
    const blocked =
      host === "localhost" ||
      host === "localhost.localdomain" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "169.254.169.254" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host);

    if (blocked) {
      return res.status(400).json({ error: "Private/internal target URLs are not allowed" });
    }

    const safeHeaders = {};
    for (const [key, value] of Object.entries(headers || {})) {
      const lower = key.toLowerCase();
      if (["host", "content-length", "connection", "transfer-encoding"].includes(lower)) continue;
      if (typeof value === "string") safeHeaders[key] = value;
    }

    const upstream = await fetch(target, {
      method,
      headers: safeHeaders,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : JSON.stringify(body ?? {}),
    });

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    const text = await upstream.text();
    return res.end(text);
  } catch (error) {
    return res.status(502).json({
      error: "Proxy request failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
