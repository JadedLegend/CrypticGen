import { isFreeModel, verifyFreeReply, verifyKey } from './engine.js';

const router = "https://openrouter.ai";
const keyStorage = "crypticgen.encrypted-openrouter-key.v1";
const modelStorage = "crypticgen.openrouter-models.v1";
const authorizationStorage = "crypticgen.openrouter-authorization.v1";
const authMarker = "crypticgen_openrouter";
const cryptoIterations = 600_000;
const encoder = new TextEncoder();

const encode = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (value) => Uint8Array.from(
  atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0),
);

function readStorage(storage, name) {
  try {
    return JSON.parse(window[storage].getItem(name) ?? "null");
  } catch {
    return null;
  }
}

function request(path, options = {}) {
  const timeout = AbortSignal.timeout(18_000);
  return fetch(`${router}/api/v1/${path}`, {
    ...options,
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  });
}

async function encryptionKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", iterations: cryptoIterations, salt },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

function validSavedKey(value) {
  return value && typeof value.salt === "string" && value.salt.length === 22
    && typeof value.iv === "string" && value.iv.length === 16
    && typeof value.data === "string" && value.data.length >= 22 && value.data.length < 6_000;
}

function cleanModel(value) {
  return typeof value === "string" && /^[A-Za-z0-9._~:/-]{1,200}$/.test(value.trim())
    ? value.trim() : "";
}

async function availableModels(key, signal) {
  try {
    const response = await request("models/user", { headers: { Authorization: `Bearer ${key}` }, signal });
    if (!response.ok) return null;
    const { data } = await response.json();
    return Array.isArray(data) ? new Set(data.flatMap(model => [model.id, model.canonical_slug]).filter(Boolean)) : null;
  } catch {
    return null;
  }
}

async function checkModel(key, model, accountModels, signal) {
  if (isFreeModel(model)) {
    await verifyFreeReply(key, model, signal);
    return { state: "ready", text: "Replied in a free chat test." };
  }

  if (model === "openrouter/auto") {
    const catalog = await accountModels;
    if (catalog && !catalog.has(model)) return { state: "warning", text: "This router is missing from your account’s model list." };
    return { state: "info", text: "Chooses a route when you generate. Reply test skipped because the route can charge." };
  }

  const parts = model.match(/^([\w][\w.-]*)\/([\w][\w.:-]*)$/);
  if (!parts) return { state: "warning", text: "Use a full model ID, such as openrouter/free." };
  const path = `models/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}/endpoints`;
  const response = await request(path, { headers: { Authorization: `Bearer ${key}` }, signal });
  const unavailable = { state: "warning", text: "No chat endpoint confirmed. Check the model ID or choose a different model." };
  if (response.status === 404) return unavailable;
  if (!response.ok) return { state: "warning", text: `Endpoint lookup failed (${response.status}). Try checking again.` };
  const { data } = await response.json();
  const { input_modalities: input, output_modalities: output } = data?.architecture ?? {};
  if ((Array.isArray(input) && !input.includes("text")) || (Array.isArray(output) && !output.includes("text"))) {
    return { state: "warning", text: "This model does not support text chat." };
  }
  if (!data?.endpoints?.length) return unavailable;
  const catalog = await accountModels;
  if (catalog && ![model, data.id, data.canonical_slug].some(id => catalog.has(id))) {
    return { state: "warning", text: "OpenRouter lists an endpoint, but this model is missing from your account’s model list." };
  }
  return { state: "info", text: "Chat endpoint listed. Paid reply test skipped." };
}

export function mountConnection({ root, trigger, onChange, stages, defaultModel }) {
  root.classList.add("connection-dialog");
  root.setAttribute("aria-labelledby", "connection-heading");
  root.innerHTML = `
    <div class="connection-content">
      <header class="connection-header">
        <h2 id="connection-heading">OpenRouter connection</h2>
        <button type="button" class="connection-close" data-connection="close" aria-label="Close connection settings">×</button>
      </header>
      <div class="connection-section">
        <div class="connection-actions">
          <button type="button" class="connection-authorize" data-connection="authorize">Connect with OpenRouter ↗</button>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">Manage keys ↗</a>
        </div>
        <label for="connection-key">OpenRouter API key</label>
        <input id="connection-key" data-connection="key" type="password" maxlength="1024" autocomplete="off" spellcheck="false" placeholder="Paste your OpenRouter key" aria-describedby="connection-key-help">
        <div class="connection-actions">
          <button type="button" data-connection="check" aria-describedby="connection-check-help">Check connection</button>
          <button type="button" data-connection="save">Save on this device</button>
          <button type="button" data-connection="unlock" hidden>Unlock saved key</button>
          <button type="button" data-connection="forget" hidden>Forget key</button>
        </div>
        <p class="connection-help" id="connection-check-help">Checks your key and assigned models. Free reply tests can use part of your free request limit. Paid models get an endpoint check only.</p>
        <div class="connection-passphrase" data-connection="passphrase-box" hidden>
          <label for="connection-passphrase" data-connection="passphrase-label">Passphrase</label>
          <input id="connection-passphrase" data-connection="passphrase" type="password" autocomplete="off" maxlength="256">
          <div class="connection-actions">
            <button type="button" data-connection="confirm-passphrase">Continue</button>
            <button type="button" data-connection="cancel-passphrase">Cancel</button>
          </div>
        </div>
        <p class="connection-help" id="connection-key-help">Your key goes directly to OpenRouter. It stays in this tab unless you save it with a passphrase.</p>
        <p class="connection-status" data-connection="status" role="status"></p>
        <ul class="connection-model-results" data-connection="model-results" aria-label="Model check results" hidden></ul>
      </div>
      <div class="connection-section">
        <label for="connection-default-model">Default model</label>
        <input id="connection-default-model" data-connection="default-model" list="connection-models" maxlength="200" autocomplete="off" spellcheck="false" aria-describedby="connection-model-help">
        <datalist id="connection-models" data-connection="models"></datalist>
        <p class="connection-help" id="connection-model-help">Search the OpenRouter catalog by name, or enter a model ID. A draft uses OpenRouter credits when your models charge for requests.</p>
        <div class="connection-actions">
          <button type="button" data-connection="refresh">Refresh model list</button>
          <span class="connection-status" data-connection="catalog-status" role="status"></span>
        </div>
        <details class="connection-overrides">
          <summary>Models by agent</summary>
          <p class="connection-help">Leave an agent blank to use the default model.</p>
          <div class="connection-agent-models" data-connection="agent-models"></div>
        </details>
      </div>
    </div>`;

  const field = (name) => root.querySelector(`[data-connection="${name}"]`);
  const keyInput = field("key");
  const status = field("status");
  const catalogStatus = field("catalog-status");
  const modelResults = field("model-results");
  const defaultInput = field("default-model");
  const passphraseBox = field("passphrase-box");
  const passphraseInput = field("passphrase");
  const catalog = field("models");
  const agentModels = new Map();
  const storedModels = readStorage("localStorage", modelStorage);
  let savedKey = readStorage("localStorage", keyStorage);
  let savedKeyIsOpen = false;
  let verified = false;
  let loadedCatalog = false;
  let passphraseAction = "";
  let modelCheck;
  let keyBusy = false;
  let authorizationBusy = false;

  defaultInput.value = cleanModel(storedModels?.default) || defaultModel;
  for (const stage of stages) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const name = document.createElement("span");
    name.textContent = stage.name;
    input.setAttribute("list", catalog.id);
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 200;
    input.placeholder = "Use default model";
    input.value = cleanModel(storedModels?.[stage.id]);
    label.append(name, input);
    field("agent-models").append(label);
    agentModels.set(stage.id, input);
  }

  function getKey() {
    return keyInput.value.trim();
  }

  function modelSelections() {
    return {
      default: cleanModel(defaultInput.value) || defaultModel,
      ...Object.fromEntries([...agentModels].map(([id, input]) => [id, cleanModel(input.value)])),
    };
  }

  function getModels() {
    const selections = modelSelections();
    for (const id of agentModels.keys()) selections[id] ||= selections.default;
    return selections;
  }

  for (const input of [defaultInput, ...agentModels.values()]) {
    input.addEventListener("input", () => {
      if (!modelResults.hidden || modelCheck) {
        clearModelCheck();
        status.textContent = "Model settings changed. Check the connection again to see results.";
        updateKeyControls();
      }
    });
    input.addEventListener("change", () => {
      input.value = cleanModel(input.value) || (input === defaultInput ? defaultModel : "");
      try {
        localStorage.setItem(modelStorage, JSON.stringify(modelSelections()));
      } catch {
        catalogStatus.textContent = "This browser can use your models for this tab.";
      }
    });
  }

  function updateKeyControls() {
    const hasKey = Boolean(getKey());
    const hasSavedKey = Boolean(validSavedKey(savedKey));
    const busy = authorizationBusy || keyBusy;
    keyInput.disabled = busy;
    field("save").disabled = busy || !hasKey || savedKeyIsOpen;
    field("unlock").disabled = busy;
    field("unlock").hidden = !hasSavedKey || savedKeyIsOpen;
    field("forget").disabled = busy;
    field("forget").hidden = !hasKey && !hasSavedKey;
    field("authorize").disabled = busy;
    field("check").disabled = busy || !hasKey || Boolean(modelCheck);
    onChange({ connected: hasKey, verified });
  }

  function keyChanged({ accepted = false, fromSaved = false } = {}) {
    clearModelCheck();
    verified = accepted;
    savedKeyIsOpen = fromSaved;
    updateKeyControls();
  }

  function clearModelCheck() {
    modelCheck?.abort();
    modelCheck = undefined;
    modelResults.hidden = true;
    modelResults.replaceChildren();
  }

  function clearPassphrase() {
    passphraseAction = "";
    passphraseInput.value = "";
    passphraseBox.hidden = true;
  }

  function showPassphrase(action) {
    passphraseAction = action;
    passphraseInput.value = "";
    field("passphrase-label").textContent = action === "save"
      ? "Set a passphrase of at least 10 characters" : "Saved key passphrase";
    field("confirm-passphrase").textContent = action === "save" ? "Save encrypted key" : "Unlock key";
    passphraseBox.hidden = false;
    passphraseInput.focus();
  }

  async function applyPassphrase() {
    const action = passphraseAction;
    const passphrase = passphraseInput.value;
    if (!action || keyBusy) return;
    if (!passphrase || (action === "save" && passphrase.length < 10)) {
      status.textContent = action === "save" ? "Use at least 10 characters for your passphrase." : "Enter your saved key passphrase.";
      return;
    }
    keyBusy = true;
    updateKeyControls();
    field("confirm-passphrase").disabled = true;
    field("cancel-passphrase").disabled = true;
    try {
      if (action === "save") {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const secret = await encryptionKey(passphrase, salt);
        const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, secret, encoder.encode(getKey()));
        const record = { salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(data)) };
        localStorage.setItem(keyStorage, JSON.stringify(record));
        savedKey = record;
        savedKeyIsOpen = true;
        status.textContent = "Encrypted key saved. Use your passphrase to unlock it next time.";
      } else {
        const secret = await encryptionKey(passphrase, decode(savedKey.salt));
        const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(savedKey.iv) }, secret, decode(savedKey.data));
        keyInput.value = new TextDecoder().decode(data);
        keyChanged({ fromSaved: true });
        status.textContent = "Saved key unlocked for this tab.";
      }
      clearPassphrase();
    } catch {
      status.textContent = action === "save"
        ? "Couldn’t save the key in this browser. You can keep using it in this tab."
        : "Couldn’t unlock the saved key with that passphrase.";
    } finally {
      keyBusy = false;
      field("confirm-passphrase").disabled = false;
      field("cancel-passphrase").disabled = false;
      updateKeyControls();
    }
  }

  async function loadCatalog() {
    const refresh = field("refresh");
    if (refresh.disabled) return;
    refresh.disabled = true;
    catalogStatus.textContent = "Loading models…";
    try {
      const response = await request("models");
      if (!response.ok) throw new Error("Catalog unavailable");
      const { data } = await response.json();
      const options = document.createDocumentFragment();
      const ids = new Set();
      for (const model of data) {
        const id = cleanModel(model.id);
        if (!id || ids.has(id)) continue;
        ids.add(id);
        const option = document.createElement("option");
        option.value = id;
        if (typeof model.name === "string") option.label = model.name;
        options.append(option);
      }
      if (!ids.size) throw new Error("Catalog empty");
      catalog.replaceChildren(options);
      loadedCatalog = true;
      catalogStatus.textContent = `${ids.size} models available`;
    } catch {
      catalogStatus.textContent = loadedCatalog ? "Refresh failed. The previous list is available." : "The model list is unavailable. You can still enter a model ID.";
    } finally {
      refresh.disabled = false;
    }
  }

  function open() {
    if (!root.open) root.showModal();
    if (!loadedCatalog) void loadCatalog();
  }

  async function checkConnection() {
    const key = getKey();
    if (!key || modelCheck) return;
    clearModelCheck();
    const check = new AbortController();
    modelCheck = check;
    const { signal } = check;
    const assignments = new Map();
    const selections = getModels();
    for (const stage of stages) {
      const model = selections[stage.id];
      if (!assignments.has(model)) assignments.set(model, []);
      assignments.get(model).push(stage.name);
    }
    updateKeyControls();
    status.textContent = "Checking your OpenRouter key…";
    try {
      await verifyKey(key, signal);
      signal.throwIfAborted();
    } catch (error) {
      if (signal.aborted) return;
      verified = false;
      status.textContent = error.message;
      modelCheck = undefined;
      updateKeyControls();
      return;
    }

    verified = true;
    status.textContent = "Key accepted. Checking assigned models…";
    modelResults.hidden = false;
    const accountModels = [...assignments.keys()].some(model => !isFreeModel(model))
      ? availableModels(key, signal) : Promise.resolve(null);

    const states = await Promise.all([...assignments].map(async ([model, agents]) => {
      const row = document.createElement("li");
      const title = document.createElement("strong");
      const names = document.createElement("span");
      const outcome = document.createElement("span");
      title.textContent = model;
      names.textContent = agents.join(", ");
      outcome.textContent = "Checking…";
      row.append(title, names, outcome);
      modelResults.append(row);
      let result;
      try {
        result = await checkModel(key, model, accountModels, signal);
      } catch (error) {
        const text = error.name === "TimeoutError" ? "OpenRouter did not reply in time. Try checking again."
          : error.name === "TypeError" ? "Couldn’t reach OpenRouter from this browser." : error.message;
        result = { state: "warning", text };
      }
      if (!signal.aborted) {
        outcome.dataset.state = result.state;
        outcome.textContent = result.text;
      }
      return result.state;
    }));
    if (signal.aborted) return;
    const warnings = states.filter(state => state === "warning").length;
    status.textContent = warnings
      ? `Key accepted. ${warnings} ${warnings === 1 ? "model needs" : "models need"} attention.`
      : "Key accepted. Model checks complete.";
    modelCheck = undefined;
    updateKeyControls();
  }

  async function authorize() {
    authorizationBusy = true;
    updateKeyControls();
    try {
      const callback = new URL(window.location.pathname, window.location.origin);
      if (callback.origin !== window.location.origin || !window.isSecureContext) {
        throw new Error("Use HTTPS or localhost");
      }
      const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
      const state = encode(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
      const authorization = new URL("/auth", router);
      callback.searchParams.set(authMarker, "1");
      authorization.search = new URLSearchParams({
        callback_url: callback.href,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        key_label: "CrypticGen",
      });
      sessionStorage.setItem(authorizationStorage, JSON.stringify({ verifier, state, started: Date.now() }));
      window.location.assign(authorization.href);
    } catch {
      authorizationBusy = false;
      updateKeyControls();
      status.textContent = "Couldn’t open OpenRouter authorization here. Paste a key or try again from the site over HTTPS.";
    }
  }

  async function finishAuthorization() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(authMarker)) return;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const pending = readStorage("sessionStorage", authorizationStorage);
    try {
      sessionStorage.removeItem(authorizationStorage);
      for (const name of [authMarker, "code", "state", "error", "error_description"]) url.searchParams.delete(name);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      open();
      status.textContent = "Couldn’t finish OpenRouter authorization in this browser. Paste your key to connect.";
      return;
    }
    open();
    const age = Date.now() - pending?.started;
    if (!code && pending) {
      status.textContent = "OpenRouter authorization was canceled. You can reconnect or paste a key.";
      return;
    }
    if (!code || !state || state !== pending?.state || !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier)
      || !Number.isFinite(age) || age < 0 || age > 10 * 60 * 1000) {
      status.textContent = "OpenRouter authorization expired or came from a different tab. Connect again or paste a key.";
      return;
    }
    authorizationBusy = true;
    updateKeyControls();
    status.textContent = "Finishing OpenRouter connection…";
    try {
      const response = await request("auth/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: pending.verifier, code_challenge_method: "S256" }),
      });
      if (!response.ok) throw new Error("Authorization failed");
      const { key } = await response.json();
      if (typeof key !== "string" || !/^sk-or-[A-Za-z0-9_-]{8,500}$/.test(key)) throw new Error("Unexpected credential format");
      keyInput.value = key;
      keyChanged({ accepted: true });
      status.textContent = "OpenRouter connected for this tab.";
    } catch {
      status.textContent = "Couldn’t finish OpenRouter authorization. Connect again or paste a key.";
    } finally {
      authorizationBusy = false;
      updateKeyControls();
    }
  }

  trigger.addEventListener("click", open);
  field("close").addEventListener("click", () => root.close());
  root.addEventListener("close", clearPassphrase);
  keyInput.addEventListener("input", () => {
    clearPassphrase();
    keyChanged();
    status.textContent = getKey() ? "Key available for this tab." : "";
  });
  field("check").addEventListener("click", checkConnection);
  field("authorize").addEventListener("click", authorize);
  field("refresh").addEventListener("click", loadCatalog);
  field("save").addEventListener("click", () => showPassphrase("save"));
  field("unlock").addEventListener("click", () => showPassphrase("unlock"));
  field("cancel-passphrase").addEventListener("click", clearPassphrase);
  field("confirm-passphrase").addEventListener("click", applyPassphrase);
  passphraseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void applyPassphrase();
    }
  });
  field("forget").addEventListener("click", () => {
    try {
      if (savedKey) localStorage.removeItem(keyStorage);
      savedKey = null;
      keyInput.value = "";
      keyChanged();
      clearPassphrase();
      status.textContent = "Key removed from this browser.";
    } catch {
      status.textContent = "Couldn’t remove the saved key from this browser.";
    }
  });

  if (validSavedKey(savedKey)) status.textContent = "Unlock your saved key or paste a key for this tab.";
  updateKeyControls();
  void finishAuthorization();
  return { open, getKey, getModels };
}
