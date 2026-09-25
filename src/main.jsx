import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

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
  useProxy: true
};

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

  const update = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

  const requestBody = useMemo(() => {
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
    if (Number(config.reasoningBudget) > 0) body.reasoning_budget = Number(config.reasoningBudget);
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

  const persist = (next) => {
    const safeConfig = { ...next, apiKey: "" };
    localStorage.setItem("fast-api-test-config", JSON.stringify(safeConfig));
  };

  const saveHistory = (entry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem("fast-api-test-history", JSON.stringify(next));
  };

  const sendRequest = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    const started = performance.now();

    try {
      const headers = config.customHeaders.trim() ? JSON.parse(config.customHeaders) : {};
      if (!config.useProxy && config.apiKey.trim()) {
        headers.Authorization = "Bearer " + config.apiKey.trim();
      }

      const requestUrl = config.useProxy ? "/api/proxy" : config.url;
      const requestPayload = config.useProxy
        ? {
            url: config.url,
            method: config.method,
            headers,
            apiKey: config.apiKey,
            body: requestBody
          }
        : requestBody;
      const requestOptions = {
        method: config.useProxy ? "POST" : config.method,
        headers: config.useProxy
          ? { "Content-Type": "application/json" }
          : headers,
        body: (config.useProxy || config.method !== "GET")
          ? JSON.stringify(requestPayload)
          : undefined
      };

      if (config.stream) {
        const res = await fetch(requestUrl, requestOptions);
        const text = await res.text();
        if (!res.ok) throw new Error(res.status + " " + res.statusText + "\n" + text);
        setResponse({
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: text,
          streaming: true
        });
        saveHistory({
          time: new Date().toISOString(),
          model: config.model,
          url: config.url,
          status: res.status,
          elapsed: Math.round(performance.now() - started)
        });
        return;
      }

      const res = await fetch(requestUrl, requestOptions);
      const text = await res.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch {}
      if (!res.ok) {
        const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "NVIDIA rejected the API key (HTTP " + res.status + "). Check that your NVIDIA Build API key is valid, active, and copied without extra quotes/spaces. If you pasted \"Bearer nvapi-...\", that format is accepted."
            + "\n\nUpstream response:\n" + detail
          );
        }
        throw new Error(res.status + " " + res.statusText + "\n" + detail);
      }
      setElapsed(Math.round(performance.now() - started));
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: parsed,
        streaming: false
      });
      saveHistory({
        time: new Date().toISOString(),
        model: config.model,
        url: config.url,
        status: res.status,
        elapsed: Math.round(performance.now() - started)
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
    localStorage.setItem("fast-api-test-config", JSON.stringify(DEFAULTS));
    setResponse(null);
    setError("");
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
          <button className="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(requestBody, null, 2))}>Copy JSON</button>
          <button className="primary" onClick={sendRequest} disabled={loading}>
            {loading ? "Sending…" : "Send Request"}
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

          <div className="grid two">
            <label>API key
              <input type="password" value={config.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="Bearer token / API key" />
            </label>
            <label>Model
              <input value={config.model} onChange={(e) => update("model", e.target.value)} placeholder="Model ID" />
            </label>
          </div>

          <div className="tabs">
            <span className="active">Message</span>
            <span>Parameters</span>
            <span>Headers</span>
            <span>Advanced</span>
          </div>

          <label>System message
            <textarea rows="3" value={config.system} onChange={(e) => update("system", e.target.value)} placeholder="Optional system instruction…" />
          </label>

          <label>User message
            <textarea className="message-box" rows="8" value={config.message} onChange={(e) => update("message", e.target.value)} placeholder="Write your message…" />
          </label>

          <div className="parameter-card">
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

          <div className="grid two">
            <label>Custom headers (JSON)
              <textarea rows="5" value={config.customHeaders} onChange={(e) => update("customHeaders", e.target.value)} />
            </label>
            <label>Extra JSON fields
              <textarea rows="5" value={config.extraJson} onChange={(e) => update("extraJson", e.target.value)} placeholder='{"some_parameter":true}' />
            </label>
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
