// assets/diagnostic-express.js — Formulaire 3 champs (profil/projet/besoins)
// Cible : Marie, 38 ans, RQTH, Garges-lès-Gonesse.
// Appelle POST /diagnostic et affiche 3 dispositifs en FALC.

(function () {
  const rag = window.OrientaProRAG;
  if (!rag || !rag.available()) {
    console.info("[Diagnostic Express] désactivé (config manquante)");
  }

  // ============================================================
  // Construction du DOM (section ancrée dans #orientapro-express)
  // ============================================================

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, ch => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function injectSection() {
    // S'il y a déjà un container, on l'utilise. Sinon on l'insère après le 1er <main>.
    let host = document.getElementById("orientapro-express");
    if (!host) {
      host = document.createElement("section");
      host.id = "orientapro-express";
      host.setAttribute("aria-labelledby", "orientapro-express-title");
      const target = document.querySelector('[data-screen="landing"]') || document.querySelector("main") || document.body;
      target.insertBefore(host, target.firstChild);
    }
    host.innerHTML = `
      <div class="op-express">
        <p class="op-express-eyebrow">Diagnostic IA — gratuit, 1 minute</p>
        <h2 id="orientapro-express-title" class="op-express-title">Trouvez vos 3 aides adaptées</h2>
        <p class="op-express-lead">Pour les personnes en situation de handicap (RQTH) et les habitants des quartiers prioritaires. Posez vos 3 informations. Notre IA souveraine vous donne les aides précises et leurs liens officiels.</p>

        <form class="op-express-grid" id="op-express-form" novalidate>
          <div class="op-express-field">
            <label for="op-express-profil" class="op-express-label">Qui êtes-vous ?</label>
            <p class="op-express-help" id="op-express-profil-help">Exemple : « Femme, 38 ans, RQTH, Garges-lès-Gonesse ». Vous pouvez ne pas tout dire.</p>
            <input
              type="text"
              id="op-express-profil"
              name="profil"
              class="op-express-input"
              maxlength="500"
              required
              aria-required="true"
              aria-describedby="op-express-profil-help"
              autocomplete="off"
            />
          </div>
          <div class="op-express-field">
            <label for="op-express-projet" class="op-express-label">Quel est votre projet ?</label>
            <p class="op-express-help" id="op-express-projet-help">Exemple : « Salon de coiffure adapté » ou « Food truck ».</p>
            <input
              type="text"
              id="op-express-projet"
              name="projet"
              class="op-express-input"
              maxlength="500"
              required
              aria-required="true"
              aria-describedby="op-express-projet-help"
              autocomplete="off"
            />
          </div>
          <div class="op-express-field">
            <label for="op-express-besoins" class="op-express-label">Que vous faut-il ?</label>
            <p class="op-express-help" id="op-express-besoins-help">Exemple : « Financement » ou « Accompagnement et formation ».</p>
            <input
              type="text"
              id="op-express-besoins"
              name="besoins"
              class="op-express-input"
              maxlength="500"
              required
              aria-required="true"
              aria-describedby="op-express-besoins-help"
              autocomplete="off"
            />
          </div>

          <div class="op-express-cta-row">
            <button type="submit" class="op-express-btn op-express-btn-primary" id="op-express-submit">
              <span>Voir mes 3 aides</span>
            </button>
            <button type="button" class="op-express-btn op-express-btn-secondary" id="op-express-demo" aria-label="Voir un exemple avec le profil de Marie, 38 ans, RQTH, Garges-lès-Gonesse">
              <span>👋 Voir la démo : Marie</span>
            </button>
          </div>
          <p class="op-express-reassure">Aucune création de compte. Vos réponses ne sont pas conservées.</p>
        </form>

        <div class="op-express-loader" id="op-express-loader" role="status" aria-live="polite">
          <p class="op-express-loader-text">Je cherche les aides les plus adaptées… (environ 10 secondes)</p>
          <div class="op-express-loader-bar"><div class="op-express-loader-fill"></div></div>
        </div>

        <div class="op-express-results" id="op-express-results" aria-live="polite" aria-atomic="false"></div>
      </div>
    `;
    return host;
  }

  // ============================================================
  // Rendu des résultats
  // ============================================================

  function renderDispositifs(data) {
    if (!data) return "";
    if (data.fallback || !data.dispositifs || data.dispositifs.length === 0) {
      return `
        <div class="op-fallback" role="region" aria-label="Résultat — aucun dispositif précis trouvé">
          <p><strong>${escapeHtml(data.message_falc || "Nous préparons votre dossier.")}</strong></p>
          <p>${escapeHtml(data.fallback_message || "Pour avancer dès cette semaine, contactez Initiactive 95 au 01 39 88 11 99 ou la CCI Val-d'Oise au 01 30 75 35 35. Ils vous accueillent gratuitement.")}</p>
        </div>
      `;
    }
    const cards = data.dispositifs.map((d, i) => `
      <article class="op-disp-card" aria-labelledby="op-disp-${i}-nom">
        <span class="op-disp-rank">Aide ${i + 1} sur ${data.dispositifs.length}</span>
        <h3 id="op-disp-${i}-nom" class="op-disp-nom">${escapeHtml(d.nom)}</h3>
        <p class="op-disp-question">${escapeHtml(d.qui)}</p>
        <p class="op-disp-question">${escapeHtml(d.combien)}</p>
        <p class="op-disp-question">${escapeHtml(d.comment)}</p>
        ${d.contact ? `<p class="op-disp-contact"><strong>Contact :</strong> ${escapeHtml(d.contact)}</p>` : ""}
        ${d.lien ? `<a class="op-disp-lien" href="${escapeHtml(d.lien)}" target="_blank" rel="noopener" aria-label="Voir la page officielle de ${escapeHtml(d.nom)} (s'ouvre dans un nouvel onglet)">Voir la page officielle ↗</a>` : ""}
        ${d.source ? `<span class="op-disp-source">Source : ${escapeHtml(d.source)}</span>` : ""}
      </article>
    `).join("");
    return `
      <p class="op-express-message">${escapeHtml(data.message_falc || "Voici les aides qui peuvent vous correspondre.")}</p>
      ${cards}
    `;
  }

  function renderError(message) {
    return `
      <div class="op-error" role="alert">
        <strong>Désolé, le service est temporairement indisponible.</strong><br>
        ${escapeHtml(message)}<br>
        <br>
        <strong>Pour avancer sans attendre :</strong><br>
        • Initiactive 95 (prêts d'honneur) : <strong>01 39 88 11 99</strong><br>
        • CCI Val-d'Oise (accompagnement gratuit) : <strong>01 30 75 35 35</strong><br>
        • AGEFIPH (aides handicap) : <strong>0 800 11 10 09</strong>
      </div>
    `;
  }

  // ============================================================
  // Logique form
  // ============================================================

  const PRESET_MARIE = {
    profil: "Femme, 38 ans, RQTH, Garges-lès-Gonesse",
    projet: "Salon de coiffure adapté aux personnes handicapées",
    besoins: "Financement et accompagnement",
  };

  function bind(host) {
    const form = host.querySelector("#op-express-form");
    const btnDemo = host.querySelector("#op-express-demo");
    const btnSubmit = host.querySelector("#op-express-submit");
    const inputs = {
      profil: host.querySelector("#op-express-profil"),
      projet: host.querySelector("#op-express-projet"),
      besoins: host.querySelector("#op-express-besoins"),
    };
    const loader = host.querySelector("#op-express-loader");
    const results = host.querySelector("#op-express-results");

    btnDemo.addEventListener("click", () => {
      inputs.profil.value = PRESET_MARIE.profil;
      inputs.projet.value = PRESET_MARIE.projet;
      inputs.besoins.value = PRESET_MARIE.besoins;
      inputs.profil.focus();
      // Auto-submit après pré-remplissage pour rendre la démo fluide.
      form.requestSubmit();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const profil = inputs.profil.value.trim();
      const projet = inputs.projet.value.trim();
      const besoins = inputs.besoins.value.trim();

      if (!profil || !projet || !besoins) {
        results.classList.add("visible");
        results.innerHTML = renderError("Il manque une réponse. Remplissez les 3 champs pour que je puisse vous aider.");
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = "<span>Recherche en cours…</span>";
      loader.classList.add("visible");
      results.classList.remove("visible");
      results.innerHTML = "";

      try {
        const data = await window.OrientaProRAG.diagnostic({ profil, projet, besoins });
        results.innerHTML = renderDispositifs(data);
        results.classList.add("visible");
        // Annoncer au lecteur d'écran que les résultats sont arrivés
        results.setAttribute("tabindex", "-1");
        results.focus({ preventScroll: false });
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        results.innerHTML = renderError((err && err.message) || "Erreur inconnue.");
        results.classList.add("visible");
      } finally {
        loader.classList.remove("visible");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = "<span>Voir mes 3 aides</span>";
      }
    });
  }

  function init() {
    const host = injectSection();
    bind(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
