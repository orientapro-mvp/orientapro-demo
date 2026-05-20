// assets/persona-faq.js — Affiche la FAQ correspondant au persona actif
// (porteurs ou structures). Démo Marie : tabs de la mini-démo "Dossier Passerelle".

(function () {
  // ============================================================
  // FAQ persona-aware — toggle FAQ porteurs / FAQ structures
  // ============================================================
  function syncFaqWithPersona(persona) {
    const faqPorteur = document.getElementById("faq");
    const faqStruct = document.getElementById("faq-structures");
    if (faqPorteur) faqPorteur.hidden = persona !== "porteur";
    if (faqStruct) faqStruct.hidden = persona !== "structure";
  }

  // Hook sur les boutons persona existants + appel initial au load
  function init() {
    document.querySelectorAll(".persona-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const persona = btn.dataset.persona;
        if (persona) setTimeout(() => syncFaqWithPersona(persona), 10);
      });
    });
    // Bouton sticky banner
    const bswitch = document.getElementById("op-persona-banner-switch");
    if (bswitch) {
      bswitch.addEventListener("click", () => {
        setTimeout(() => {
          const cur = localStorage.getItem("orientapro_persona") || "porteur";
          syncFaqWithPersona(cur);
        }, 20);
      });
    }
    // Onglet nav "Côté Structures" / "Côté Porteurs"
    document.querySelectorAll('[onclick*="switchPersona"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        setTimeout(() => {
          const cur = localStorage.getItem("orientapro_persona") || "porteur";
          syncFaqWithPersona(cur);
        }, 20);
      });
    });
    // Sync initial
    const cur = localStorage.getItem("orientapro_persona") || "porteur";
    syncFaqWithPersona(cur);
  }

  // ============================================================
  // Mini-démo "Dossier de Marie / Karim / Fatou" — onglets persona
  // ============================================================
  function initDemoTabs() {
    const tabs = document.querySelectorAll(".op-demo-tab");
    if (!tabs.length) return;
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.demoPersona;
        // Activer le tab
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        // Afficher le contenu correspondant
        document.querySelectorAll("[data-demo-content]").forEach((c) => {
          c.hidden = c.dataset.demoContent !== target;
        });
        if (window.trackEvent) window.trackEvent("demo_persona_switched", { persona: target });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { init(); initDemoTabs(); });
  } else {
    init();
    initDemoTabs();
  }
})();
