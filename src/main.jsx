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
        if ((res.status === 401 || res.status === 403) && typeof parsed === "object" && parsed?.title === "NVIDIA inference access denied") {
          throw new Error(
            "NVIDIA accepted your API key for /v1/models, but rejected /v1/chat/completions. This is an NVIDIA inference-access permission issue, not a Vercel CORS problem."
            + "\n\n" + detail
          );
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "NVIDIA rejected authentication (HTTP " + res.status + "). Run 'Test NVIDIA Key' first. If that test succeeds, the problem is inference entitlement; if it fails, the key itself is not being accepted."
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
          <button className="ghost" onClick={testNvidiaKey} disabled={loading}>Test NVIDIA Key</button>
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

          <div className="model-note"><span className="free-badge">FREE</span> NVIDIA Build currently marks verified free-endpoint models with this label. “Free Endpoint” means the endpoint is offered without endpoint usage charges; limits may still apply.</div>

          <div className="grid two">
            <label>API key
              <input type="password" value={config.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder="Bearer token / API key" />
            </label>
            <label>Model
              <select
                className="model-select"
                value={NVIDIA_MODELS.includes(config.model) ? config.model : "__custom__"}
                onChange={(e) => {
                  if (e.target.value !== "__custom__") update("model", e.target.value);
                }}
              >
              <optgroup label="01-ai">
                <option key="01-ai/yi-large" value="01-ai/yi-large">yi-large</option>
              </optgroup>
              <optgroup label="adept">
                <option key="adept/fuyu-8b" value="adept/fuyu-8b">fuyu-8b</option>
              </optgroup>
              <optgroup label="ai21labs">
                <option key="ai21labs/jamba-1.5-large-instruct" value="ai21labs/jamba-1.5-large-instruct">jamba-1.5-large-instruct</option>
              </optgroup>
              <optgroup label="aisingapore">
                <option key="aisingapore/sea-lion-7b-instruct" value="aisingapore/sea-lion-7b-instruct">sea-lion-7b-instruct</option>
              </optgroup>
              <optgroup label="bigcode">
                <option key="bigcode/starcoder2-15b" value="bigcode/starcoder2-15b">starcoder2-15b</option>
              </optgroup>
              <optgroup label="databricks">
                <option key="databricks/dbrx-instruct" value="databricks/dbrx-instruct">dbrx-instruct</option>
              </optgroup>
              <optgroup label="deepseek-ai">
                <option key="deepseek-ai/deepseek-coder-6.7b-instruct" value="deepseek-ai/deepseek-coder-6.7b-instruct">deepseek-coder-6.7b-instruct</option>
                <option key="deepseek-ai/deepseek-v4.1-flash" value="deepseek-ai/deepseek-v4.1-flash">deepseek-v4.1-flash · FREE</option>
              </optgroup>
              <optgroup label="google">
                <option key="google/codegemma-1.1-7b" value="google/codegemma-1.1-7b">codegemma-1.1-7b</option>
                <option key="google/codegemma-7b" value="google/codegemma-7b">codegemma-7b</option>
                <option key="google/deplot" value="google/deplot">deplot</option>
                <option key="google/diffusiongemma-26b-a4b-it" value="google/diffusiongemma-26b-a4b-it">diffusiongemma-26b-a4b-it · FREE</option>
                <option key="google/gemma-2b" value="google/gemma-2b">gemma-2b</option>
                <option key="google/gemma-3-12b-it" value="google/gemma-3-12b-it">gemma-3-12b-it</option>
                <option key="google/gemma-3-4b-it" value="google/gemma-3-4b-it">gemma-3-4b-it</option>
                <option key="google/gemma-4-31b-it" value="google/gemma-4-31b-it">gemma-4-31b-it · FREE</option>
                <option key="google/recurrentgemma-2b" value="google/recurrentgemma-2b">recurrentgemma-2b</option>
              </optgroup>
              <optgroup label="ibm">
                <option key="ibm/granite-3.0-3b-a800m-instruct" value="ibm/granite-3.0-3b-a800m-instruct">granite-3.0-3b-a800m-instruct</option>
                <option key="ibm/granite-3.0-8b-instruct" value="ibm/granite-3.0-8b-instruct">granite-3.0-8b-instruct</option>
                <option key="ibm/granite-34b-code-instruct" value="ibm/granite-34b-code-instruct">granite-34b-code-instruct</option>
                <option key="ibm/granite-8b-code-instruct" value="ibm/granite-8b-code-instruct">granite-8b-code-instruct</option>
              </optgroup>
              <optgroup label="meta">
                <option key="meta/codellama-70b" value="meta/codellama-70b">codellama-70b</option>
                <option key="meta/llama-3.2-11b-vision-instruct" value="meta/llama-3.2-11b-vision-instruct">llama-3.2-11b-vision-instruct · FREE</option>
                <option key="meta/llama-3.2-90b-vision-instruct" value="meta/llama-3.2-90b-vision-instruct">llama-3.2-90b-vision-instruct · FREE</option>
                <option key="meta/llama-guard-4-12b" value="meta/llama-guard-4-12b">llama-guard-4-12b · FREE</option>
                <option key="meta/llama2-70b" value="meta/llama2-70b">llama2-70b</option>
                <option key="meta/muse-glimmer-30b" value="meta/muse-glimmer-30b">muse-glimmer-30b · FREE</option>
              </optgroup>
              <optgroup label="microsoft">
                <option key="microsoft/kosmos-2" value="microsoft/kosmos-2">kosmos-2</option>
                <option key="microsoft/phi-3-vision-128k-instruct" value="microsoft/phi-3-vision-128k-instruct">phi-3-vision-128k-instruct</option>
                <option key="microsoft/phi-3.5-moe-instruct" value="microsoft/phi-3.5-moe-instruct">phi-3.5-moe-instruct</option>
              </optgroup>
              <optgroup label="mistralai">
                <option key="mistralai/codestral-22b-instruct-v0.1" value="mistralai/codestral-22b-instruct-v0.1">codestral-22b-instruct-v0.1</option>
                <option key="mistralai/mistral-7b-instruct-v0.3" value="mistralai/mistral-7b-instruct-v0.3">mistral-7b-instruct-v0.3</option>
                <option key="mistralai/mistral-large" value="mistralai/mistral-large">mistral-large</option>
                <option key="mistralai/mistral-large-2-instruct" value="mistralai/mistral-large-2-instruct">mistral-large-2-instruct</option>
                <option key="mistralai/mistral-nemotron" value="mistralai/mistral-nemotron">mistral-nemotron · FREE</option>
                <option key="mistralai/mixtral-8x22b-v0.1" value="mistralai/mixtral-8x22b-v0.1">mixtral-8x22b-v0.1</option>
              </optgroup>
              <optgroup label="moonshotai">
                <option key="moonshotai/kimi-k2.6" value="moonshotai/kimi-k2.6">kimi-k2.6</option>
                <option key="moonshotai/kimi-k3" value="moonshotai/kimi-k3">kimi-k3 · FREE</option>
              </optgroup>
              <optgroup label="nv-mistralai">
                <option key="nv-mistralai/mistral-nemo-12b-instruct" value="nv-mistralai/mistral-nemo-12b-instruct">mistral-nemo-12b-instruct</option>
              </optgroup>
              <optgroup label="nvidia">
                <option key="nvidia/ai-synthetic-video-detector" value="nvidia/ai-synthetic-video-detector">ai-synthetic-video-detector</option>
                <option key="nvidia/cosmos-reason2-8b" value="nvidia/cosmos-reason2-8b">cosmos-reason2-8b</option>
                <option key="nvidia/embed-qa-4" value="nvidia/embed-qa-4">embed-qa-4</option>
                <option key="nvidia/ising-calibration-1.5-31b" value="nvidia/ising-calibration-1.5-31b">ising-calibration-1.5-31b</option>
                <option key="nvidia/llama-3.1-nemoguard-8b-content-safety" value="nvidia/llama-3.1-nemoguard-8b-content-safety">llama-3.1-nemoguard-8b-content-safety</option>
                <option key="nvidia/llama-3.1-nemoguard-8b-topic-control" value="nvidia/llama-3.1-nemoguard-8b-topic-control">llama-3.1-nemoguard-8b-topic-control</option>
                <option key="nvidia/llama-3.1-nemotron-51b-instruct" value="nvidia/llama-3.1-nemotron-51b-instruct">llama-3.1-nemotron-51b-instruct</option>
                <option key="nvidia/llama-3.1-nemotron-70b-instruct" value="nvidia/llama-3.1-nemotron-70b-instruct">llama-3.1-nemotron-70b-instruct</option>
                <option key="nvidia/llama-3.1-nemotron-safety-guard-8b-v3" value="nvidia/llama-3.1-nemotron-safety-guard-8b-v3">llama-3.1-nemotron-safety-guard-8b-v3</option>
                <option key="nvidia/llama-3.1-nemotron-ultra-253b-v1" value="nvidia/llama-3.1-nemotron-ultra-253b-v1">llama-3.1-nemotron-ultra-253b-v1</option>
                <option key="nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1" value="nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1">llama-3.2-nemoretriever-1b-vlm-embed-v1</option>
                <option key="nvidia/llama-3.2-nv-embedqa-1b-v1" value="nvidia/llama-3.2-nv-embedqa-1b-v1">llama-3.2-nv-embedqa-1b-v1</option>
                <option key="nvidia/llama-nemotron-embed-vl-1b-v2" value="nvidia/llama-nemotron-embed-vl-1b-v2">llama-nemotron-embed-vl-1b-v2</option>
                <option key="nvidia/llama3-chatqa-1.5-70b" value="nvidia/llama3-chatqa-1.5-70b">llama3-chatqa-1.5-70b</option>
                <option key="nvidia/mistral-nemo-minitron-8b-8k-instruct" value="nvidia/mistral-nemo-minitron-8b-8k-instruct">mistral-nemo-minitron-8b-8k-instruct</option>
                <option key="nvidia/nemotron-3-embed-1b" value="nvidia/nemotron-3-embed-1b">nemotron-3-embed-1b</option>
                <option key="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning">nemotron-3-nano-omni-30b-a3b-reasoning</option>
                <option key="nvidia/nemotron-3-super-120b-a12b" value="nvidia/nemotron-3-super-120b-a12b">nemotron-3-super-120b-a12b · FREE</option>
                <option key="nvidia/nemotron-3-ultra-550b-a55b" value="nvidia/nemotron-3-ultra-550b-a55b">nemotron-3-ultra-550b-a55b · FREE</option>
                <option key="nvidia/nemotron-3.5-content-safety" value="nvidia/nemotron-3.5-content-safety">nemotron-3.5-content-safety · FREE</option>
                <option key="nvidia/nemotron-3.5-lightning-30b-a3b" value="nvidia/nemotron-3.5-lightning-30b-a3b">nemotron-3.5-lightning-30b-a3b · FREE</option>
                <option key="nvidia/nemotron-4-340b-instruct" value="nvidia/nemotron-4-340b-instruct">nemotron-4-340b-instruct</option>
                <option key="nvidia/nemotron-4-340b-reward" value="nvidia/nemotron-4-340b-reward">nemotron-4-340b-reward</option>
                <option key="nvidia/nemotron-nano-3-30b-a3b" value="nvidia/nemotron-nano-3-30b-a3b">nemotron-nano-3-30b-a3b</option>
                <option key="nvidia/nemotron-parse" value="nvidia/nemotron-parse">nemotron-parse</option>
                <option key="nvidia/nemotron-parse-2.0" value="nvidia/nemotron-parse-2.0">nemotron-parse-2.0</option>
                <option key="nvidia/neva-22b" value="nvidia/neva-22b">neva-22b</option>
                <option key="nvidia/nv-embedqa-mistral-7b-v2" value="nvidia/nv-embedqa-mistral-7b-v2">nv-embedqa-mistral-7b-v2</option>
                <option key="nvidia/nvclip" value="nvidia/nvclip">nvclip</option>
                <option key="nvidia/riva-translate-4b-instruct" value="nvidia/riva-translate-4b-instruct">riva-translate-4b-instruct</option>
                <option key="nvidia/riva-translate-4b-instruct-v1.1" value="nvidia/riva-translate-4b-instruct-v1.1">riva-translate-4b-instruct-v1.1</option>
                <option key="nvidia/riva-translate-4b-instruct-v2" value="nvidia/riva-translate-4b-instruct-v2">riva-translate-4b-instruct-v2</option>
                <option key="nvidia/vila" value="nvidia/vila">vila</option>
              </optgroup>
              <optgroup label="openai">
                <option key="openai/gpt-oss-20b" value="openai/gpt-oss-20b">gpt-oss-20b · FREE</option>
              </optgroup>
              <optgroup label="poolside">
                <option key="poolside/laguna-xs-2.1" value="poolside/laguna-xs-2.1">laguna-xs-2.1 · FREE</option>
              </optgroup>
              <optgroup label="snowflake">
                <option key="snowflake/arctic-embed-l" value="snowflake/arctic-embed-l">arctic-embed-l</option>
              </optgroup>
              <optgroup label="writer">
                <option key="writer/palmyra-creative-122b" value="writer/palmyra-creative-122b">palmyra-creative-122b</option>
                <option key="writer/palmyra-fin-70b-32k" value="writer/palmyra-fin-70b-32k">palmyra-fin-70b-32k</option>
                <option key="writer/palmyra-med-70b" value="writer/palmyra-med-70b">palmyra-med-70b</option>
                <option key="writer/palmyra-med-70b-32k" value="writer/palmyra-med-70b-32k">palmyra-med-70b-32k</option>
              </optgroup>
              <optgroup label="z-ai">
                <option key="z-ai/glm-5.3" value="z-ai/glm-5.3">glm-5.3 · FREE</option>
                <option key="z-ai/glm-5.3-flash" value="z-ai/glm-5.3-flash">glm-5.3-flash · FREE</option>
              </optgroup>
              <optgroup label="zyphra">
                <option key="zyphra/zamba2-7b-instruct" value="zyphra/zamba2-7b-instruct">zamba2-7b-instruct</option>
              </optgroup>
                <optgroup label="Other">
                  <option value="__custom__">Custom model…</option>
                </optgroup>
              </select>
              {!NVIDIA_MODELS.includes(config.model) && (
                <input
                  value={config.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Enter custom model ID"
                />
              )}
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
