export const maxDuration = 300;

function normalizeApiKey(value) {
  if (typeof value !== "string") return "";
  let key = value.trim();

  // Remove accidental surrounding quotes from copy/paste.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Accept either a raw key or "Bearer <key>".
  key = key.replace(/^Bearer\s+/i, "").trim();

  return key;
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const incoming = typeof req.body === "string"
      ? JSON.parse(req.body)
      : (req.body || {});

    const {
      url,
      method = "POST",
      headers = {},
      body,
      apiKey = ""
    } = incoming;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing target URL" });
    }

    const target = new URL(url);

    if (!["http:", "https:"].includes(target.protocol)) {
      return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported" });
    }

    if (isPrivateHost(target.hostname)) {
      return res.status(400).json({ error: "Private/internal target URLs are not allowed" });
    }

    const safeHeaders = {};

    for (const [key, value] of Object.entries(headers || {})) {
      const lower = String(key).toLowerCase();

      if (
        ["host", "content-length", "connection", "transfer-encoding"].includes(lower)
      ) {
        continue;
      }

      // Never let a stale browser header override the explicit API-key field.
      if (lower === "authorization" && normalizeApiKey(apiKey)) {
        continue;
      }

      if (typeof value === "string") {
        safeHeaders[key] = value;
      }
    }

    const normalizedKey = normalizeApiKey(apiKey);

    if (normalizedKey) {
      safeHeaders.Authorization = `Bearer ${normalizedKey}`;
    }

    if (!safeHeaders.Accept) {
      safeHeaders.Accept = "application/json";
    }

    if (
      !["GET", "HEAD"].includes(String(method).toUpperCase()) &&
      !safeHeaders["Content-Type"] &&
      !safeHeaders["content-type"]
    ) {
      safeHeaders["Content-Type"] = "application/json";
    }

    const upstream = await fetch(target, {
      method,
      headers: safeHeaders,
      body: ["GET", "HEAD"].includes(String(method).toUpperCase())
        ? undefined
        : JSON.stringify(body ?? {})
    });

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", contentType);

    const text = await upstream.text();
    return res.end(text);
  } catch (error) {
    return res.status(502).json({
      error: "Proxy request failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
