// assets/exemple-dossier.js — Modale "Voir un exemple de dossier"
// Preview du Dossier Passerelle Fatou D. (projet salon de coiffure, RQTH, Garges).
// MVP de démonstration — données fictives.

(function () {
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
  function track(n, p) { if (window.trackEvent) window.trackEvent(n, p); }

  function openExempleModal() {
    const modal = $("#modal-exemple");
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    track("exemple_modal_opened");
    setTimeout(() => {
      const closeBtn = modal.querySelector(".close-modal");
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  function closeExempleModal() {
    const modal = $("#modal-exemple");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function bind() {
    // Branche tous les boutons "Voir un exemple de dossier"
    $$('[data-go="exemple"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openExempleModal();
      }, { capture: true });
    });
    $$('#modal-exemple [data-close-exemple]').forEach((b) => b.addEventListener("click", closeExempleModal));
    const modal = $("#modal-exemple");
    if (modal) {
      modal.addEventListener("click", (e) => { if (e.target === modal) closeExempleModal(); });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const m = $("#modal-exemple");
        if (m && m.classList.contains("open")) closeExempleModal();
      }
    });
  }

  window.openExempleModal = openExempleModal;
  window.closeExempleModal = closeExempleModal;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
