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
  key = key
    .replace(/^Bearer\s+/i, "")
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
    .trim();

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

    const normalizedKey = normalizeApiKey(apiKey);
    const isNvidia = target.hostname === "integrate.api.nvidia.com";

    const safeHeaders = {};

    if (isNvidia) {
      // NVIDIA: send only the headers required by its OpenAI-compatible API.
      safeHeaders.Accept = "application/json";
      safeHeaders["Content-Type"] = "application/json";
      if (normalizedKey) {
        safeHeaders.Authorization = `Bearer ${normalizedKey}`;
      }
    } else {
      for (const [key, value] of Object.entries(headers || {})) {
        const lower = String(key).toLowerCase();

        if (
          ["host", "content-length", "connection", "transfer-encoding"].includes(lower)
        ) {
          continue;
        }

        if (lower === "authorization" && normalizedKey) {
          continue;
        }

        if (typeof value === "string") {
          safeHeaders[key] = value;
        }
      }

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
    }

    const requestBody = ["GET", "HEAD"].includes(String(method).toUpperCase())
      ? undefined
      : JSON.stringify(body ?? {});

    let upstream = await fetch(target, {
      method,
      headers: safeHeaders,
      body: requestBody,
      redirect: "manual"
    });

    // Some upstream infrastructure may redirect. Preserve NVIDIA authentication
    // only when the redirect remains within NVIDIA's API infrastructure.
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");

      if (location) {
        const redirected = new URL(location, target);

        const allowedRedirect =
          redirected.hostname === "integrate.api.nvidia.com" ||
          redirected.hostname.endsWith(".api.nvidia.com");

        if (!allowedRedirect) {
          return res.status(502).json({
            error: "Unsafe upstream redirect",
            location: redirected.origin
          });
        }

        upstream = await fetch(redirected, {
          method,
          headers: safeHeaders,
          body: requestBody,
          redirect: "manual"
        });
      }
    }

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    const text = await upstream.text();

    // NVIDIA can distinguish a valid key from an account that lacks access to
    // the public inference endpoints. Diagnose that case automatically.
    if (isNvidia && (upstream.status === 401 || upstream.status === 403) && normalizedKey) {
      try {
        const modelsResponse = await fetch("https://integrate.api.nvidia.com/v1/models", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${normalizedKey}`
          },
          redirect: "manual"
        });

        if (modelsResponse.ok) {
          return res.status(403).json({
            status: 403,
            title: "NVIDIA inference access denied",
            detail: "NVIDIA accepted this API key for the model catalog, but rejected inference access. The account/key likely lacks the NVIDIA Public API Endpoints permission.",
            upstream: JSON.parse(text),
            diagnostic: {
              models_endpoint: 200,
              inference_endpoint: upstream.status
            }
          });
        }
      } catch {
        // Keep the original upstream error if the diagnostic request fails.
      }
    }

    res.statusCode = upstream.status;
    res.setHeader("Content-Type", contentType);
    return res.end(text);
  } catch (error) {
    return res.status(502).json({
      error: "Proxy request failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
