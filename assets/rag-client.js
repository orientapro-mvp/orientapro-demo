// assets/rag-client.js — Client JS pour l'API OrientaPro RAG
// Appelle POST /diagnostic et POST /chat. Pas de streaming, JSON simple.
// Expose : window.OrientaProRAG = { diagnostic, chat, available, healthcheck }

(function () {
  const cfg = window.ORIENTAPRO_CONFIG || {};

  function available() {
    return cfg.RAG_ENABLED !== false && !!cfg.RAG_API_URL;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || cfg.RAG_TIMEOUT_MS || 25000);
    try {
      const res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async function postJson(path, body) {
    if (!available()) throw new Error("RAG désactivé");
    const url = cfg.RAG_API_URL.replace(/\/+$/, "") + path;
    let res;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err && err.name === "AbortError"
        ? "Le service met trop de temps à répondre."
        : "Le service est injoignable.";
      throw new Error(msg);
    }
    if (!res.ok) {
      let detail = "HTTP " + res.status;
      try {
        const j = await res.json();
        if (j && (j.message || j.detail)) detail = j.message || j.detail;
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  async function diagnostic({ profil, projet, besoins, territoire }) {
    const body = { profil, projet, besoins };
    if (territoire) body.territoire = territoire;
    return postJson("/diagnostic", body);
  }

  async function chat({ message, contexte }) {
    const body = { message };
    if (contexte) body.contexte = contexte;
    return postJson("/chat", body);
  }

  async function healthcheck() {
    if (!available()) return { ok: false };
    try {
      const res = await fetchWithTimeout(
        cfg.RAG_API_URL.replace(/\/+$/, "") + "/health",
        { method: "GET" },
        4000,
      );
      if (!res.ok) return { ok: false };
      return res.json();
    } catch (_) {
      return { ok: false };
    }
  }

  window.OrientaProRAG = { diagnostic, chat, available, healthcheck };
})();
