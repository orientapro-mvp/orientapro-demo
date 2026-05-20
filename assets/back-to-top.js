// assets/back-to-top.js — Bouton "Retour en haut" flottant accessible.
// Apparaît au scroll > 400 px, position fixed bas-droite (libérée par la
// suppression du widget chatbot). WCAG 2.1 AA : aria-label, focus visible,
// touche tactile 48×48, label texte pour lecteurs d'écran.

(function () {
  const SCROLL_THRESHOLD = 400;

  function inject() {
    if (document.getElementById("op-back-to-top")) return;
    const btn = document.createElement("button");
    btn.id = "op-back-to-top";
    btn.className = "op-back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Retour en haut de page");
    btn.setAttribute("title", "Retour en haut");
    btn.hidden = true;
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg><span class="sr-only">Retour en haut</span>';
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.trackEvent) window.trackEvent("back_to_top_clicked");
      // Focus retour sur le tout premier élément focusable de la page pour l'accessibilité
      setTimeout(() => {
        const target = document.querySelector(".skip-link") || document.querySelector("h1");
        if (target) target.focus({ preventScroll: true });
      }, 600);
    });
    document.body.appendChild(btn);

    let lastVisible = false;
    function onScroll() {
      const visible = window.scrollY > SCROLL_THRESHOLD;
      if (visible !== lastVisible) {
        lastVisible = visible;
        btn.hidden = !visible;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
