import { lookup } from "node:dns/promises";
import net from "node:net";

export const maxDuration = 300;

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1"
]);

function normalizeApiKey(value) {
  if (typeof value !== "string") return "";
  let key = value.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  return key
    .replace(/^Bearer\s+/i, "")
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip) {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  );
}

function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

async function assertPublicTarget(target) {
  const hostname = target.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Private/internal target URLs are not allowed.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private/internal target URLs are not allowed.");
    }
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Target hostname resolves to a private/internal address.");
  }
}

function parseIncomingBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

function parseContentLength(req) {
  const raw = req.headers?.["content-length"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const length = Number(value);
  return Number.isFinite(length) ? length : 0;
}

function copySafeHeaders(source) {
  const result = {};

  for (const [key, value] of Object.entries(source || {})) {
    const lower = String(key).toLowerCase();

    if (
      ["host", "content-length", "connection", "transfer-encoding"].includes(lower)
    ) {
      continue;
    }

    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
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
    return sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "This proxy endpoint accepts POST requests only.",
      allowed_method: "POST"
    });
  }

  if (parseContentLength(req) > MAX_BODY_BYTES) {
    return sendJson(res, 413, {
      error: "PAYLOAD_TOO_LARGE",
      message: "Request payload exceeds the 2 MB proxy limit."
    });
  }

  const started = Date.now();
  let target;
  let targetMethod = "POST";
  let normalizedKey = "";
  let isNvidia = false;

  try {
    const incoming = parseIncomingBody(req);
    const {
      url,
      method = "POST",
      headers = {},
      body = {},
      apiKey = ""
    } = incoming;

    if (!url || typeof url !== "string") {
      return sendJson(res, 400, {
        error: "INVALID_TARGET",
        message: "A target URL is required."
      });
    }

    target = new URL(url);
    targetMethod = String(method).toUpperCase();

    if (!["http:", "https:"].includes(target.protocol)) {
      return sendJson(res, 400, {
        error: "INVALID_PROTOCOL",
        message: "Only HTTP and HTTPS target URLs are supported."
      });
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(targetMethod)) {
      return sendJson(res, 400, {
        error: "INVALID_METHOD",
        message: "Unsupported target HTTP method."
      });
    }

    await assertPublicTarget(target);

    normalizedKey = normalizeApiKey(apiKey);
    isNvidia = target.hostname === "integrate.api.nvidia.com";

    const safeHeaders = copySafeHeaders(headers);

    if (isNvidia) {
      // NVIDIA uses a normal Bearer token on the OpenAI-compatible API.
      delete safeHeaders.Authorization;
      delete safeHeaders.authorization;
      safeHeaders.Accept = safeHeaders.Accept || "application/json";
      safeHeaders["Content-Type"] = "application/json";

      if (normalizedKey) {
        safeHeaders.Authorization = `Bearer ${normalizedKey}`;
      }
    } else {
      if (normalizedKey) {
        delete safeHeaders.Authorization;
        delete safeHeaders.authorization;
        safeHeaders.Authorization = `Bearer ${normalizedKey}`;
      }

      if (!safeHeaders.Accept) {
        safeHeaders.Accept = "application/json";
      }

      if (
        !["GET", "HEAD"].includes(targetMethod) &&
        !safeHeaders["Content-Type"] &&
        !safeHeaders["content-type"]
      ) {
        safeHeaders["Content-Type"] = "application/json";
      }
    }

    const requestBody =
      ["GET", "HEAD"].includes(targetMethod) ? undefined : JSON.stringify(body);

    const upstream = await fetch(target, {
      method: targetMethod,
      headers: safeHeaders,
      body: requestBody,
      redirect: "manual"
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json; charset=utf-8";

    // Handle redirects explicitly so authentication is never silently lost.
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");

      if (!location) {
        return sendJson(res, 502, {
          error: "UPSTREAM_REDIRECT",
          message: "Upstream returned a redirect without a Location header."
        });
      }

      const redirected = new URL(location, target);
      const sameAuthority =
        redirected.hostname === target.hostname ||
        (isNvidia &&
          (redirected.hostname === "integrate.api.nvidia.com" ||
            redirected.hostname.endsWith(".api.nvidia.com")));

      if (!sameAuthority) {
        return sendJson(res, 502, {
          error: "UNSAFE_UPSTREAM_REDIRECT",
          message: "The upstream redirected to a different host and was blocked."
        });
      }

      const redirectedResponse = await fetch(redirected, {
        method: targetMethod,
        headers: safeHeaders,
        body: requestBody,
        redirect: "manual"
      });

      return await finishUpstreamResponse(
        redirectedResponse,
        res,
        contentType,
        isNvidia,
        normalizedKey,
        started
      );
    }

    return await finishUpstreamResponse(
      upstream,
      res,
      contentType,
      isNvidia,
      normalizedKey,
      started
    );
  } catch (error) {
    return sendJson(res, 502, {
      error: "PROXY_ERROR",
      message: error instanceof Error ? error.message : String(error),
      target: target?.origin || null,
      method: targetMethod,
      duration_ms: Date.now() - started
    });
  }
}

async function finishUpstreamResponse(
  upstream,
  res,
  contentType,
  isNvidia,
  normalizedKey,
  started
) {
  res.statusCode = upstream.status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Proxy-Duration-Ms", String(Date.now() - started));

  // Auth failures are buffered so we can provide a useful NVIDIA diagnosis.
  if (isNvidia && (upstream.status === 401 || upstream.status === 403) && normalizedKey) {
    const text = await upstream.text();

    try {
      const modelsResponse = await fetch(
        "https://integrate.api.nvidia.com/v1/models",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${normalizedKey}`
          }
        }
      );

      if (modelsResponse.ok) {
        return sendJson(res, 403, {
          status: 403,
          title: "NVIDIA inference access denied",
          detail:
            "NVIDIA accepted the API key for /v1/models but rejected /v1/chat/completions. The NVIDIA account/key needs inference entitlement such as Public API Endpoints access.",
          upstream: safeParse(text),
          diagnostic: {
            models_endpoint: 200,
            inference_endpoint: upstream.status
          }
        });
      }
    } catch {
      // Fall back to the original upstream response.
    }

    return res.end(text);
  }

  // Stream SSE/chunked responses without buffering.
  if (contentType.includes("text/event-stream") || contentType.includes("application/x-ndjson")) {
    if (!upstream.body) return res.end();

    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return res.end();
  }

  const text = await upstream.text();
  return res.end(text);
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}
