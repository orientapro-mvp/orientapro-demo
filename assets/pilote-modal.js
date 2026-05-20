// assets/pilote-modal.js — Modale "Réserver ma place pilote"
// Formulaire fictif : enregistrement localStorage + confirmation visuelle.
// MVP de démonstration — aucune transmission serveur.

(function () {
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function track(name, payload) { if (window.trackEvent) window.trackEvent(name, payload); }

  function openPiloteModal() {
    const modal = $("#modal-pilote");
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    // Focus premier champ
    setTimeout(() => { const f = $("#pilote-prenom"); if (f) f.focus(); }, 50);
    // Cache la confirmation au cas où elle aurait été affichée précédemment
    const confirmEl = $("#pilote-confirmation");
    const formEl = $("#pilote-form");
    if (confirmEl) confirmEl.hidden = true;
    if (formEl) formEl.hidden = false;
    track("pilote_modal_opened");
  }

  function closePiloteModal() {
    const modal = $("#modal-pilote");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    track("pilote_modal_closed");
  }

  function setError(field, message) {
    const errEl = field.parentElement.querySelector(".op-pilote-error");
    if (errEl) {
      errEl.textContent = message || "";
      errEl.hidden = !message;
    }
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate(data) {
    const errors = {};
    if (!data.prenom || data.prenom.length < 2) errors.prenom = "Renseignez votre prénom (2 caractères minimum).";
    if (!data.nom || data.nom.length < 2) errors.nom = "Renseignez votre nom (2 caractères minimum).";
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(data.email)) errors.email = "Adresse e-mail invalide.";
    if (!data.role) errors.role = "Choisissez votre rôle.";
    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const data = {
      prenom: (fd.get("prenom") || "").trim(),
      nom: (fd.get("nom") || "").trim(),
      email: (fd.get("email") || "").trim(),
      role: fd.get("role") || "",
      organisation: (fd.get("organisation") || "").trim(),
      message: (fd.get("message") || "").trim(),
      ts: new Date().toISOString(),
    };

    // Reset des erreurs
    $$(".op-pilote-error", form).forEach(el => { el.textContent = ""; el.hidden = true; });
    $$("[name]", form).forEach(el => el.removeAttribute("aria-invalid"));

    const errors = validate(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([key, msg]) => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) setError(field, msg);
      });
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    // Anti double-submit
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }

    // Enregistrement local (MVP)
    try {
      const all = JSON.parse(localStorage.getItem("orientapro_pilote_demandes") || "[]");
      all.push(data);
      localStorage.setItem("orientapro_pilote_demandes", JSON.stringify(all));
    } catch (_) {}

    track("pilote_form_submitted", { role: data.role, hasOrga: !!data.organisation });

    // Affichage de la confirmation
    setTimeout(() => {
      const formEl = $("#pilote-form");
      const confirmEl = $("#pilote-confirmation");
      if (formEl) formEl.hidden = true;
      if (confirmEl) {
        confirmEl.hidden = false;
        const greeting = $("#pilote-confirmation-name");
        if (greeting) greeting.textContent = data.prenom;
        confirmEl.setAttribute("tabindex", "-1");
        confirmEl.focus();
      }
      if (btn) { btn.disabled = false; btn.textContent = "Envoyer ma demande"; }
    }, 500);
  }

  function bindModal() {
    // Branche tous les boutons "Réserver ma place pilote"
    $$('[data-open="pilote"]').forEach(btn => btn.addEventListener("click", openPiloteModal));
    // Boutons de fermeture (X, "Retour")
    $$('#modal-pilote [data-close-pilote]').forEach(btn => btn.addEventListener("click", closePiloteModal));
    // Fermeture par clic à l'extérieur du content
    const modal = $("#modal-pilote");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closePiloteModal();
      });
    }
    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const m = $("#modal-pilote");
        if (m && m.classList.contains("open")) closePiloteModal();
      }
    });
    // Submit
    const form = $("#pilote-form");
    if (form) form.addEventListener("submit", handleSubmit);
  }

  // Expose
  window.openPiloteModal = openPiloteModal;
  window.closePiloteModal = closePiloteModal;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindModal);
  } else {
    bindModal();
  }
})();
