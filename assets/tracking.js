// assets/tracking.js — Tracking interne simple, sans backend analytics
// Stocke les événements dans localStorage pour usage MVP / debug pitch.
// Remplaçable facilement par Plausible/Matomo plus tard.

(function () {
  const KEY = "orientapro_events";
  const MAX_EVENTS = 200; // garde-fou

  function getEvents() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function pushEvent(name, payload) {
    if (!name || typeof name !== "string") return;
    const events = getEvents();
    events.push({
      ts: new Date().toISOString(),
      name,
      payload: payload || null,
      url: location.pathname + location.search,
    });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    try {
      localStorage.setItem(KEY, JSON.stringify(events));
    } catch (_) {
      // localStorage plein ou refusé → silencieux
    }
  }

  function trackEvent(name, payload) {
    pushEvent(name, payload);
    // Console pour debug pendant le développement (peut être désactivé en prod)
    if (window.ORIENTAPRO_DEBUG) console.log("[track]", name, payload || "");
  }

  function getAllEvents() {
    return getEvents();
  }

  function clearEvents() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  function exportEventsAsJson() {
    const data = JSON.stringify(getEvents(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orientapro-events-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.OrientaProTracking = {
    track: trackEvent,
    getAll: getAllEvents,
    clear: clearEvents,
    export: exportEventsAsJson,
  };
  // Alias court
  window.trackEvent = trackEvent;

  // Track page view automatique au chargement
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => trackEvent("page_view", { path: location.pathname }));
  } else {
    trackEvent("page_view", { path: location.pathname });
  }
})();
