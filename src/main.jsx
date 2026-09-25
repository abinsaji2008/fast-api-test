import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const FREE_ENDPOINT_MODELS = new Set([
  "deepseek-ai/deepseek-v4.1-flash",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-content-safety",
  "openai/gpt-oss-20b",
  "meta/llama-guard-4-12b",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "mistralai/mistral-nemotron",
  "moonshotai/kimi-k3",
  "poolside/laguna-xs-2.1",
  "meta/muse-glimmer-30b",
  "google/diffusiongemma-26b-a4b-it",
  "google/gemma-4-31b-it",
  "z-ai/glm-5.3",
  "z-ai/glm-5.3-flash"
]);

const NVIDIA_MODELS = [
  "01-ai/yi-large",
  "adept/fuyu-8b",
  "ai21labs/jamba-1.5-large-instruct",
  "aisingapore/sea-lion-7b-instruct",
  "bigcode/starcoder2-15b",
  "databricks/dbrx-instruct",
  "deepseek-ai/deepseek-coder-6.7b-instruct",
  "deepseek-ai/deepseek-v4.1-flash",
  "google/codegemma-1.1-7b",
  "google/codegemma-7b",
  "google/deplot",
  "google/diffusiongemma-26b-a4b-it",
  "google/gemma-2b",
  "google/gemma-3-12b-it",
  "google/gemma-3-4b-it",
  "google/gemma-4-31b-it",
  "google/recurrentgemma-2b",
  "ibm/granite-3.0-3b-a800m-instruct",
  "ibm/granite-3.0-8b-instruct",
  "ibm/granite-34b-code-instruct",
  "ibm/granite-8b-code-instruct",
  "meta/codellama-70b",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "meta/llama-guard-4-12b",
  "meta/llama2-70b",
  "meta/muse-glimmer-30b",
  "microsoft/kosmos-2",
  "microsoft/phi-3-vision-128k-instruct",
  "microsoft/phi-3.5-moe-instruct",
  "mistralai/codestral-22b-instruct-v0.1",
  "mistralai/mistral-7b-instruct-v0.3",
  "mistralai/mistral-large",
  "mistralai/mistral-large-2-instruct",
  "mistralai/mistral-nemotron",
  "mistralai/mixtral-8x22b-v0.1",
  "moonshotai/kimi-k2.6",
  "moonshotai/kimi-k3",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "nvidia/ai-synthetic-video-detector",
  "nvidia/cosmos-reason2-8b",
  "nvidia/embed-qa-4",
  "nvidia/ising-calibration-1.5-31b",
  "nvidia/llama-3.1-nemoguard-8b-content-safety",
  "nvidia/llama-3.1-nemoguard-8b-topic-control",
  "nvidia/llama-3.1-nemotron-51b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
  "nvidia/llama-3.2-nv-embedqa-1b-v1",
  "nvidia/llama-nemotron-embed-vl-1b-v2",
  "nvidia/llama3-chatqa-1.5-70b",
  "nvidia/mistral-nemo-minitron-8b-8k-instruct",
  "nvidia/nemotron-3-embed-1b",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-content-safety",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-4-340b-instruct",
  "nvidia/nemotron-4-340b-reward",
  "nvidia/nemotron-nano-3-30b-a3b",
  "nvidia/nemotron-parse",
  "nvidia/nemotron-parse-2.0",
  "nvidia/neva-22b",
  "nvidia/nv-embedqa-mistral-7b-v2",
  "nvidia/nvclip",
  "nvidia/riva-translate-4b-instruct",
  "nvidia/riva-translate-4b-instruct-v1.1",
  "nvidia/riva-translate-4b-instruct-v2",
  "nvidia/vila",
  "openai/gpt-oss-20b",
  "poolside/laguna-xs-2.1",
  "snowflake/arctic-embed-l",
  "writer/palmyra-creative-122b",
  "writer/palmyra-fin-70b-32k",
  "writer/palmyra-med-70b",
  "writer/palmyra-med-70b-32k",
  "z-ai/glm-5.3",
  "z-ai/glm-5.3-flash",
  "zyphra/zamba2-7b-instruct"
];

const DEFAULTS = {
  method: "POST",
  url: "https://integrate.api.nvidia.com/v1/chat/completions",
  apiKey: "",
  model: "nvidia/nemotron-3.5-lightning-30b-a3b",
  message: "Write a limerick about the wonders of GPU computing.",
  system: "",
  temperature: 1,
  topP: 0.95,
  maxTokens: 1024,
  reasoningBudget: 0,
  enableThinking: true,
  stream: false,
  customHeaders: '{"Content-Type":"application/json","Accept":"application/json"}',
  extraJson: "",
  useProxy: true,
  bodyMode: "chat",
  rawBody: ""
};

async function readStreamingResponse(response, onText, onFirstByte) {
  if (!response.body) {
    const text = await response.text();
    onText(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let combined = "";
  let firstByteReported = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!firstByteReported) {
        firstByteReported = true;
        onFirstByte?.();
      }

      combined += decoder.decode(value, { stream: true });
      onText(combined);
    }

    combined += decoder.decode();
    onText(combined);
    return combined;
  } finally {
    reader.releaseLock();
  }
}

function App() {
  const [config, setConfig] = useState(() => {
    try {
      return {
        ...DEFAULTS,
        useProxy: true,
        ...JSON.parse(localStorage.getItem("fast-api-test-config") || "{}"),
        apiKey: sessionStorage.getItem("fast-api-test-api-key") || ""
      };
    } catch {
      return { ...DEFAULTS };
    }
  });
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fast-api-test-history") || "[]"); }
    catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("message");
  const [modelSearch, setModelSearch] = useState("");
  const [availableModels, setAvailableModels] = useState(NVIDIA_MODELS);
  const requestControllerRef = React.useRef(null);

  const update = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

  const requestBody = useMemo(() => {
    if (config.bodyMode === "raw") {
      if (!config.rawBody.trim()) return {};
      try {
        return JSON.parse(config.rawBody);
      } catch {
        return null;
      }
    }

    const messages = [];
    if (config.system.trim()) messages.push({ role: "system", content: config.system });
    messages.push({ role: "user", content: config.message });

    const body = {
      model: config.model,
      messages,
      temperature: Number(config.temperature),
      top_p: Number(config.topP),
      max_tokens: Number(config.maxTokens),
      stream: Boolean(config.stream)
    };

    if (Number(config.reasoningBudget) > 0) {
      body.reasoning_budget = Number(config.reasoningBudget);
    }

    if (config.enableThinking) {
      body.chat_template_kwargs = { enable_thinking: true };
    }

    if (config.extraJson.trim()) {
      try {
        Object.assign(body, JSON.parse(config.extraJson));
      } catch {}
    }

    return body;
  }, [config]);

  const modelGroups = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    const filtered = availableModels.filter((id) =>
      !query || id.toLowerCase().includes(query)
    );
    const groups = {};
    for (const id of filtered) {
      const provider = id.includes("/") ? id.split("/")[0] : "other";
      (groups[provider] ||= []).push(id);
    }
    return Object.entries(groups);
  }, [availableModels, modelSearch]);

  const requestBodyError =
    config.bodyMode === "raw" && requestBody === null
      ? "Raw JSON is invalid. Fix the JSON before sending."
      : "";

  const persist = (next) => {
    const safeConfig = { ...next, apiKey: "" };
    localStorage.setItem("fast-api-test-config", JSON.stringify(safeConfig));
  };

  const saveHistory = (entry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem("fast-api-test-history", JSON.stringify(next));
  };

  const refreshModels = async () => {
    setLoading(true);
    setError("");

    try {
      const target = new URL(config.url);
      target.pathname = target.pathname.replace(/\/chat\/completions\/?$/, "/models");
      if (!target.pathname.endsWith("/models")) {
        throw new Error("Model refresh expects an OpenAI-compatible /v1/chat/completions URL.");
      }

      const headers = config.customHeaders.trim() ? JSON.parse(config.customHeaders) : {};
      const payload = {
        url: target.toString(),
        method: "GET",
        headers,
        apiKey: config.apiKey
      };

      const res = await fetch(config.useProxy ? "/api/proxy" : target.toString(), {
        method: config.useProxy ? "POST" : "GET",
        headers: config.useProxy
          ? { "Content-Type": "application/json" }
          : headers,
        body: config.useProxy ? JSON.stringify(payload) : undefined
      });

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = null; }

      if (!res.ok) {
        throw new Error("Model refresh failed (HTTP " + res.status + ")\n\n" + (parsed ? JSON.stringify(parsed, null, 2) : text));
      }

      const ids = Array.isArray(parsed?.data)
        ? parsed.data.map((item) => item?.id).filter(Boolean)
        : [];

      if (!ids.length) {
        throw new Error("The endpoint returned no model IDs.");
      }

      setAvailableModels((current) => Array.from(new Set([...ids, ...current])));
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: {
          ok: true,
          models_loaded: ids.length,
          sample: ids.slice(0, 20)
        },
        streaming: false
      });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = () => {
    requestControllerRef.current?.abort();
  };

  const sendRequest = async () => {
    setLoading(true);
    requestControllerRef.current = new AbortController();
    setError("");
    setResponse(null);

    const started = performance.now();
    let firstByteAt = null;

    try {
      if (!config.url.trim()) throw new Error("Enter an API URL.");
      if (requestBodyError) throw new Error(requestBodyError);

      const targetUrl = new URL(config.url);
      const headers = config.customHeaders.trim()
        ? JSON.parse(config.customHeaders)
        : {};

      if (config.bodyMode === "raw" && requestBody === null) {
        throw new Error("Raw JSON is invalid.");
      }

      if (!config.useProxy && config.apiKey.trim()) {
        headers.Authorization = "Bearer " + config.apiKey.trim();
      }

      const payload = {
        url: targetUrl.toString(),
        method: config.method,
        headers,
        apiKey: config.apiKey,
        body: requestBody ?? {}
      };

      const requestUrl = config.useProxy ? "/api/proxy" : targetUrl.toString();
      const requestOptions = {
        method: config.useProxy ? "POST" : config.method,
        headers: config.useProxy
          ? { "Content-Type": "application/json" }
          : headers,
        body:
          config.useProxy || !["GET", "HEAD"].includes(config.method)
            ? JSON.stringify(config.useProxy ? payload : requestBody ?? {})
            : undefined
      };

      const requestOptionsWithSignal = {
        ...requestOptions,
        signal: requestControllerRef.current.signal
      };

      const timeoutId = setTimeout(() => {
        requestControllerRef.current?.abort();
      }, 285000);

      let res;
      try {
        res = await fetch(requestUrl, requestOptionsWithSignal);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch {}

        const detail =
          typeof parsed === "string"
            ? parsed
            : JSON.stringify(parsed, null, 2);

        throw new Error(
          "HTTP " + res.status + " " + res.statusText +
          "\\n\\n" + detail
        );
      }

      if (config.stream) {
        await readStreamingResponse(
          res,
          (text) => {
            setResponse({
              status: res.status,
              statusText: res.statusText,
              headers: Object.fromEntries(res.headers.entries()),
              body: text,
              streaming: true
            });
          },
          () => {
            firstByteAt = performance.now();
            setElapsed(Math.round(firstByteAt - started));
          }
        );
      } else {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch {}

        setResponse({
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: parsed,
          streaming: false
        });
      }

      const total = Math.round(performance.now() - started);
      setElapsed(total);

      saveHistory({
        time: new Date().toISOString(),
        model: config.model,
        url: config.url,
        status: res.status,
        elapsed: total,
        streamed: Boolean(config.stream)
      });
    } catch (e) {
      setElapsed(Math.round(performance.now() - started));
      setError(
        e?.name === "AbortError"
          ? "Request cancelled or timed out after 285 seconds."
          : (e?.message || String(e))
      );
    } finally {
      setLoading(false);
      requestControllerRef.current = null;
      sessionStorage.setItem("fast-api-test-api-key", config.apiKey || "");
      persist(config);
    }
  };

  const testNvidiaKey = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    const started = performance.now();

    try {
      if (!config.apiKey.trim()) {
        throw new Error("Enter your NVIDIA API key first.");
      }

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://integrate.api.nvidia.com/v1/models",
          method: "GET",
          apiKey: config.apiKey,
          headers: {}
        })
      });

      const text = await res.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch {}

      if (!res.ok) {
        const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
        throw new Error("NVIDIA key test failed (HTTP " + res.status + ").\n\n" + detail);
      }

      const count = Array.isArray(parsed?.data) ? parsed.data.length : "available";
      setElapsed(Math.round(performance.now() - started));
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: {
          ok: true,
          message: "NVIDIA accepted the API key for the model catalog.",
          models: count,
          next_step: "Test a chat completion. If chat returns 401/403 while this succeeds, the account/key likely lacks Public API Endpoints inference permission."
        },
        streaming: false
      });
    } catch (e) {
      setElapsed(Math.round(performance.now() - started));
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
      sessionStorage.setItem("fast-api-test-api-key", config.apiKey || "");
      persist(config);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    const value = typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2);
    await navigator.clipboard.writeText(value);
  };

  const reset = () => {
    setConfig({ ...DEFAULTS });
    sessionStorage.removeItem("fast-api-test-api-key");
    localStorage.setItem("fast-api-test-config", JSON.stringify({ ...DEFAULTS, apiKey: "" }));
    setResponse(null);
    setError("");
    setElapsed(0);
    setModelSearch("");
    setAvailableModels(NVIDIA_MODELS);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">⚡</div>
          <div>
            <div className="brand-title">Fast API Test</div>
            <div className="brand-subtitle">Postman-style AI API playground</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={reset}>Reset</button>
          <button className="ghost" onClick={testNvidiaKey} disabled={loading}>Test NVIDIA Key</button>
          <button className="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(requestBody, null, 2))}>Copy JSON</button>
          <button
            className={loading ? "danger" : "primary"}
            onClick={loading ? cancelRequest : sendRequest}
          >
            {loading ? "Stop Request" : "Send Request"}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="request-panel">
          <div className="section-title">Request</div>

          <div className="method-url">
            <select value={config.method} onChange={(e) => update("method", e.target.value)}>
              {["POST","GET","PUT","PATCH","DELETE"].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input value={config.url} onChange={(e) => update("url", e.target.value)} placeholder="https://api.example.com/v1/chat/completions" />
          </div>

          <div className="model-note"><span className="free-badge">FREE</span> NVIDIA Build currently marks verified free-endpoint models with this label. “Free Endpoint” means the endpoint is offered without endpoint usage charges; limits may still apply.</div>

          <div className="grid two">
            <label>API key
              <input type="password" value={config.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="Bearer token / API key" />
            </label>
            <label>
              Model
              <input
                className="model-search"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search models…"
              />
              <select
                className="model-select"
                value={NVIDIA_MODELS.includes(config.model) || availableModels.includes(config.model) ? config.model : "__custom__"}
                onChange={(e) => {
                  if (e.target.value !== "__custom__") update("model", e.target.value);
                }}
              >
                {modelGroups.map(([provider, ids]) => (
                  <optgroup key={provider} label={provider}>
                    {ids.map((id) => (
                      <option key={id} value={id}>
                        {id.split("/").slice(1).join("/")}
                        {FREE_ENDPOINT_MODELS.has(id) ? " · FREE" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Other">
                  <option value="__custom__">Custom model…</option>
                </optgroup>
              </select>
              {(!NVIDIA_MODELS.includes(config.model) && !availableModels.includes(config.model)) && (
                <input
                  value={config.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Enter custom model ID"
                />
              )}
            </label>
          </div>

          <div className="tabs">
            {[
              ["message", "Message"],
              ["parameters", "Parameters"],
              ["headers", "Headers"],
              ["advanced", "Advanced"]
            ].map(([id, label]) => (
              <button
                key={id}
                className={activeTab === id ? "tab active" : "tab"}
                onClick={() => {
                  setActiveTab(id);
                  document.getElementById(id + "-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div id="message-section" className="section-anchor">
            <div className="subsection-head">
              <strong>Request body</strong>
              <button className="ghost small-button" onClick={refreshModels} disabled={loading}>Refresh models</button>
            </div>
            <div className="segmented">
              <button className={config.bodyMode === "chat" ? "segment active" : "segment"} onClick={() => update("bodyMode", "chat")}>Chat JSON</button>
              <button className={config.bodyMode === "raw" ? "segment active" : "segment"} onClick={() => update("bodyMode", "raw")}>Raw JSON</button>
            </div>
          </div>

          {config.bodyMode === "chat" ? (
            <>
              <label>System message
                <textarea rows="3" value={config.system} onChange={(e) => update("system", e.target.value)} placeholder="Optional system instruction…" />
              </label>

              <label>User message
                <textarea className="message-box" rows="8" value={config.message} onChange={(e) => update("message", e.target.value)} placeholder="Write your message…" />
              </label>
            </>
          ) : (
            <label>
              Raw JSON body
              <textarea
                rows="16"
                value={config.rawBody}
                onChange={(e) => update("rawBody", e.target.value)}
                className={requestBodyError ? "invalid" : ""}
                placeholder='{"model":"...","messages":[{"role":"user","content":"Hello"}]}'
              />
              {requestBodyError && <span className="field-error">{requestBodyError}</span>}
            </label>
          )}

          <div id="parameters-section" className="section-anchor parameter-card">
            <div className="parameter-title">Generation parameters</div>
            <div className="grid four">
              <label>Temperature
                <input type="number" min="0" max="2" step="0.01" value={config.temperature} onChange={(e) => update("temperature", e.target.value)} />
              </label>
              <label>Top P
                <input type="number" min="0" max="1" step="0.01" value={config.topP} onChange={(e) => update("topP", e.target.value)} />
              </label>
              <label>Max tokens
                <input type="number" min="1" value={config.maxTokens} onChange={(e) => update("maxTokens", e.target.value)} />
              </label>
              <label>Reasoning budget
                <input type="number" min="0" value={config.reasoningBudget} onChange={(e) => update("reasoningBudget", e.target.value)} />
              </label>
            </div>
            <div className="toggle-row">
              <label className="switch-label"><input type="checkbox" checked={config.useProxy} onChange={(e) => update("useProxy", e.target.checked)} /><span>Use Vercel proxy</span></label>
              <label className="switch-label"><input type="checkbox" checked={config.enableThinking} onChange={(e) => update("enableThinking", e.target.checked)} /><span>Enable thinking</span></label>
              <label className="switch-label"><input type="checkbox" checked={config.stream} onChange={(e) => update("stream", e.target.checked)} /><span>Stream response</span></label>
            </div>
          </div>

          <div id="headers-section" className="grid two">
            <label>Custom headers (JSON)
              <textarea rows="5" value={config.customHeaders} onChange={(e) => update("customHeaders", e.target.value)} />
            </label>
            <label>Extra JSON fields
              <textarea rows="5" value={config.extraJson} onChange={(e) => update("extraJson", e.target.value)} placeholder='{"some_parameter":true}' />
            </label>
          </div>

          <div id="advanced-section" className="section-anchor">
            <div className="parameter-title">Advanced request settings</div>
          </div>

          <div className="request-preview">
            <div className="preview-head">
              <span>Generated request body</span>
              <span className="muted">{JSON.stringify(requestBody).length} chars</span>
            </div>
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
          </div>
        </section>

        <section className="response-panel">
          <div className="response-head">
            <div>
              <div className="section-title">Response</div>
              <div className="meta">
                {response ? <><span className="status">{response.status} {response.statusText}</span><span>{elapsed} ms</span></> : <span>Send a request to see the response</span>}
              </div>
            </div>
            <button className="ghost" onClick={copyResponse} disabled={!response}>Copy</button>
          </div>

          {error && <div className="error-box"><strong>Request failed</strong><pre>{error}</pre></div>}

          {!response && !error && (
            <div className="empty-state">
              <div className="empty-icon">⌁</div>
              <h2>Ready to test</h2>
              <p>Enter an API URL, credentials, model and message, then press Send Request.</p>
            </div>
          )}

          {response && (
            <div className="response-body">
              <pre>{typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2)}</pre>
            </div>
          )}

          <div className="history">
            <div className="section-title small">Recent requests</div>
            {history.length === 0 ? <div className="muted">No requests yet.</div> : history.map((h, i) => (
              <div className="history-item" key={i}>
                <div><span className="status-dot"></span>{h.model}</div>
                <div className="muted">{h.status} · {h.elapsed} ms</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer>Fast API Test · Vercel proxy keeps browser CORS out of the request path. API keys are sent to the proxy and forwarded to the configured endpoint.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
