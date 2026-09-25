import assert from "node:assert/strict";
import handler from "../api/proxy.js";

function makeResponse() {
  const chunks = [];
  const headers = {};
  return {
    statusCode: 200,
    body: "",
    chunks,
    headers,
    setHeader(key, value) { headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    end(value = "") { this.body += String(value); this.ended = true; return this; },
    write(value) { chunks.push(Buffer.from(value)); return true; }
  };
}

function makeReq(body, extra = {}) {
  const raw = JSON.stringify(body);
  return {
    method: "POST",
    headers: {
      "content-length": String(Buffer.byteLength(raw)),
      ...(extra.headers || {})
    },
    body
  };
}

function jsonResponse(status, value, contentType = "application/json") {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": contentType }
  });
}

let calls = [];

globalThis.fetch = async (url, options = {}) => {
  calls.push({
    url: String(url),
    options: {
      method: options.method,
      headers: Object.fromEntries(new Headers(options.headers).entries()),
      body: options.body,
      redirect: options.redirect
    }
  });

  const target = String(url);

  if (target.endsWith("/v1/models")) {
    return jsonResponse(200, { object: "list", data: [{ id: "nvidia/nemotron-3.5-lightning-30b-a3b" }] });
  }

  if (target.includes("/chat/completions")) {
    return jsonResponse(200, {
      id: "test-completion",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }]
    });
  }

  return jsonResponse(200, { ok: true });
};

{
  const res = makeResponse();
  await handler(
    makeReq({
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      method: "POST",
      apiKey: "nvapi-test",
      headers: { Authorization: "Bearer WRONG", "X-Test": "yes" },
      body: { model: "nvidia/nemotron-3.5-lightning-30b-a3b", messages: [{ role: "user", content: "hi" }] }
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  const upstream = calls.find((c) => c.url.includes("/chat/completions"));
  assert.equal(upstream.options.headers.authorization, "Bearer nvapi-test");
  assert.equal(upstream.options.headers["content-type"], "application/json");
  assert.match(upstream.options.body, /nvidia\/nemotron-3\.5-lightning-30b-a3b/);
}

{
  calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      options: {
        ...options,
        headers: Object.fromEntries(new Headers(options.headers).entries())
      }
    });
    return jsonResponse(200, { ok: true });
  };

  const res = makeResponse();
  await handler(
    makeReq({
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      method: "POST",
      apiKey: "nvapi-test",
      headers: { AUTHORIZATION: "Bearer WRONG" },
      body: { model: "model-1", messages: [{ role: "user", content: "hi" }] }
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  const upstream = calls.find((c) => c.url.includes("/chat/completions"));
  assert.equal(upstream.options.headers.authorization, "Bearer nvapi-test");
}

{
  const res = makeResponse();
  await handler(
    makeReq({
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      method: "POST",
      apiKey: "",
      headers: {},
      body: { model: "model-1", messages: [{ role: "user", content: "hi" }] }
    }),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body, /MISSING_API_KEY/);
}

{
  const res = makeResponse();
  await handler(
    {
      method: "POST",
      headers: { "content-length": "10" },
      body: "{not-json"
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body, /INVALID_JSON/);
}

{
  calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      options: {
        ...options,
        headers: Object.fromEntries(new Headers(options.headers).entries())
      }
    });
    if (String(url).endsWith("/v1/models")) {
      return jsonResponse(200, { object: "list", data: [{ id: "model-1" }] });
    }
    if (String(url).includes("/chat/completions")) {
      return jsonResponse(403, { status: 403, title: "Forbidden", detail: "Authorization failed" }, "application/problem+json");
    }
    return jsonResponse(200, {});
  };

  const res = makeResponse();
  await handler(
    makeReq({
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      method: "POST",
      apiKey: "nvapi-test",
      headers: {},
      body: { model: "model-1", messages: [{ role: "user", content: "hi" }] }
    }),
    res
  );

  assert.equal(res.statusCode, 403);
  const diagnostic = JSON.parse(res.body);
  assert.equal(diagnostic.title, "NVIDIA inference access denied");
  assert.equal(diagnostic.diagnostic.models_endpoint, 200);
  assert.equal(diagnostic.diagnostic.inference_endpoint, 403);
}

{
  const res = makeResponse();
  await handler(
    makeReq({
      url: "https://example.com/api",
      method: "POST",
      apiKey: "abc",
      headers: {},
      body: { hello: "world" }
    }),
    res
  );
  assert.equal(res.statusCode, 200);
  const upstream = calls.at(-1);
  assert.equal(upstream.options.headers.authorization, "Bearer abc");
}

{
  const res = makeResponse();
  await handler(
    {
      method: "POST",
      headers: { "content-length": String(3 * 1024 * 1024) },
      body: {}
    },
    res
  );
  assert.equal(res.statusCode, 413);
}

{
  const res = makeResponse();
  await handler({ method: "GET", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
}

console.log("proxy tests: PASS");
