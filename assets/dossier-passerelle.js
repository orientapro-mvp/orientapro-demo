// assets/dossier-passerelle.js — Génère le "Dossier Passerelle OrientaPro"
// à partir des réponses du questionnaire + résultats du matching.
//
// Affiche le dossier dans une nouvelle screen (data-screen="dossier"),
// avec PDF via jsPDF (déjà chargé en CDN) et bouton "Copier le message"
// prêt à envoyer à la structure recommandée.

(function () {
  // ----- Helpers --------------------------------------------------

  function safe(v, fb) { return (v === null || v === undefined || v === "") ? (fb || "—") : v; }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, ch => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function trackIfPossible(name, payload) {
    if (typeof window.trackEvent === "function") window.trackEvent(name, payload);
  }

  // Récupère le diagnostic le plus récent (celui de la session en cours).
  function getLatestDiag() {
    if (typeof DIAGNOSTICS === "undefined" || !DIAGNOSTICS.length) return null;
    // Le dernier diagnostic inséré est en tête (unshift)
    return DIAGNOSTICS[0];
  }

  function findStructure(structureId) {
    if (typeof STRUCTURES === "undefined") return null;
    return STRUCTURES.find(s => s.id === structureId) || null;
  }

  function findProgramme(progId) {
    if (typeof PROGRAMMES === "undefined") return null;
    return PROGRAMMES.find(p => p.id === progId) || null;
  }

  // ----- Texte FALC du message à copier ---------------------------

  function buildMessage(diag, topStructureName) {
    const aliasOrPrenom = diag.porteurAlias || "Bonjour";
    const projet = diag.descriptionProjet || `${safe(diag.secteurProjet, "")}`.toLowerCase();
    const stade = (diag.maturiteProjet || "").toLowerCase();
    const besoin = (diag.besoinPrincipal || "").toLowerCase();
    return [
      `Bonjour,`,
      ``,
      `Je souhaite démarrer un accompagnement pour mon projet entrepreneurial.`,
      `J'ai préparé un Dossier Passerelle OrientaPro qui résume mon profil, mon projet et mes besoins.`,
      ``,
      `En quelques mots :`,
      `• Profil : ${safe(diag.trancheAge, "—")} ans, ${diag.rqth ? "RQTH, " : ""}${diag.qpv ? "résident QPV, " : ""}${safe(diag.statutActuel, "")}`,
      `• Projet : ${projet || "à définir"}`,
      `• Stade : ${stade || "à préciser"}`,
      `• Besoin principal : ${besoin || "à préciser"}`,
      ``,
      `Serait-il possible de convenir d'un premier échange afin d'identifier le programme d'accompagnement le plus adapté ?`,
      ``,
      `Vous trouverez le dossier complet en pièce jointe (PDF).`,
      ``,
      `Merci par avance,`,
      `${aliasOrPrenom !== "Bonjour" ? aliasOrPrenom : "[Votre prénom]"}`,
    ].join("\n");
  }

  // ----- Rendu HTML du dossier -----------------------------------

  function renderDossier(diag) {
    if (!diag) {
      return `<div class="op-dossier-empty">
        <h2>Aucun diagnostic disponible</h2>
        <p>Complétez d'abord le questionnaire pour générer votre Dossier Passerelle.</p>
        <button class="btn btn-primary" data-go="diagnostic">Commencer le diagnostic</button>
      </div>`;
    }

    const matchedItems = (diag.programmesMatched || []).slice(0, 3).map(m => {
      const p = findProgramme(m.id) || {};
      const s = findStructure(p.structureId) || {};
      return Object.assign({}, p, { structure: s, score: m.score, raisons: m.raisons });
    });

    const topName = matchedItems[0]
      ? `${matchedItems[0].structure.nom || ""} — ${matchedItems[0].nom || ""}`
      : "une structure d'accompagnement";

    const documents = computeDocuments(diag, matchedItems);
    const prochaines = computeProchainesEtapes(diag, matchedItems);
    const message = buildMessage(diag, topName);

    return `
      <div class="op-dossier" id="dossier-content">
        <header class="op-dossier-header">
          <p class="eyebrow">Dossier Passerelle OrientaPro</p>
          <h2 class="h2">Votre dossier prêt à présenter</h2>
          <p class="op-dossier-sub">Présentez ce dossier lors de votre premier rendez-vous avec la structure recommandée. Il résume votre profil, votre projet et vos besoins pour gagner du temps.</p>
          <div class="op-dossier-actions">
            <button class="btn btn-primary" id="dossier-download-pdf">📄 Télécharger en PDF</button>
            <button class="btn btn-outline" id="dossier-print">🖨️ Imprimer</button>
            <button class="btn btn-primary" id="dossier-transferer" data-open="transferer">📤 Transférer à la structure</button>
          </div>
          <p class="op-dossier-copy-feedback" id="dossier-copy-feedback" aria-live="polite"></p>
        </header>

        <!-- Section 1 — Identité porteur -->
        <section class="op-dossier-section">
          <h3>1. Qui je suis</h3>
          <ul class="op-dossier-ul">
            <li><strong>Tranche d'âge :</strong> ${escapeHtml(safe(diag.trancheAge))}</li>
            <li><strong>Statut actuel :</strong> ${escapeHtml(safe(diag.statutActuel))}</li>
            ${diag.rqth ? `<li><strong>Situation handicap :</strong> RQTH (Reconnaissance de la Qualité de Travailleur Handicapé)</li>` : ""}
            ${diag.qpv ? `<li><strong>Quartier :</strong> Résident d'un Quartier Prioritaire de la Ville (QPV)</li>` : ""}
          </ul>
        </section>

        <!-- Section 2 — Territoire -->
        <section class="op-dossier-section">
          <h3>2. Où je suis</h3>
          <ul class="op-dossier-ul">
            <li><strong>Région :</strong> ${escapeHtml(safe(diag.region))}</li>
            ${diag.ville ? `<li><strong>Ville :</strong> ${escapeHtml(diag.ville)}</li>` : ""}
          </ul>
        </section>

        <!-- Section 3 — Mon projet -->
        <section class="op-dossier-section">
          <h3>3. Mon projet</h3>
          <ul class="op-dossier-ul">
            <li><strong>Secteur :</strong> ${escapeHtml(safe(diag.secteurProjet))}</li>
            <li><strong>Stade :</strong> ${escapeHtml(safe(diag.maturiteProjet))}</li>
            ${diag.descriptionProjet ? `<li><strong>Description :</strong> ${escapeHtml(diag.descriptionProjet)}</li>` : ""}
          </ul>
        </section>

        <!-- Section 4 — Stade d'avancement -->
        <section class="op-dossier-section">
          <h3>4. Mon niveau d'avancement</h3>
          <p>${stadeDescription(diag.maturiteProjet)}</p>
        </section>

        <!-- Section 5 — Besoins -->
        <section class="op-dossier-section">
          <h3>5. Mes besoins prioritaires</h3>
          <ul class="op-dossier-ul">
            <li><strong>Besoin principal :</strong> ${escapeHtml(safe(diag.besoinPrincipal))}</li>
            ${diag.blocagePrincipal ? `<li><strong>Blocage identifié :</strong> ${escapeHtml(diag.blocagePrincipal)}</li>` : ""}
            ${diag.echeance ? `<li><strong>Échéance :</strong> ${escapeHtml(diag.echeance)}</li>` : ""}
          </ul>
        </section>

        <!-- Section 6 — Programmes recommandés -->
        <section class="op-dossier-section">
          <h3>6. Programmes recommandés pour moi</h3>
          ${matchedItems.length === 0
            ? `<p>Aucun programme recommandé pour l'instant. Recommencez le diagnostic ou contactez la CCI Val-d'Oise (01 30 75 35 35).</p>`
            : matchedItems.map((m, i) => `
              <article class="op-dossier-prog">
                <div class="op-dossier-prog-head">
                  <span class="op-dossier-prog-rank">#${i+1}</span>
                  <div>
                    <strong>${escapeHtml(m.structure.nom || "")}</strong>
                    <div class="op-dossier-prog-name">${escapeHtml(m.nom || "")}</div>
                  </div>
                  <div class="op-dossier-prog-score">${m.score}<small>/100</small></div>
                </div>
                ${m.description ? `<p class="op-dossier-prog-desc">${escapeHtml(m.description)}</p>` : ""}
                ${(m.raisons && m.raisons.length) ? `
                  <div class="op-dossier-prog-why">
                    <strong>Pourquoi ce programme :</strong>
                    <ul>${m.raisons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
                  </div>` : ""}
              </article>`).join("")}
        </section>

        <!-- Section 7 — Explication du matching -->
        <section class="op-dossier-section">
          <h3>7. Pourquoi ces programmes</h3>
          <p>${explicationMatching(diag, matchedItems)}</p>
        </section>

        <!-- Section 8 — Documents à préparer -->
        <section class="op-dossier-section">
          <h3>8. Documents à préparer</h3>
          <ul class="op-dossier-ul">
            ${documents.map(d => `<li>${escapeHtml(d)}</li>`).join("")}
          </ul>
        </section>

        <!-- Section 9 — Prochaines étapes -->
        <section class="op-dossier-section">
          <h3>9. Mes prochaines étapes</h3>
          <ol class="op-dossier-ol">
            ${prochaines.map(p => `<li>${escapeHtml(p)}</li>`).join("")}
          </ol>
        </section>

        <!-- Section 10 — Message à envoyer -->
        <section class="op-dossier-section">
          <h3>10. Message prêt à envoyer</h3>
          <pre class="op-dossier-message" id="dossier-message-text">${escapeHtml(message)}</pre>
        </section>

        <footer class="op-dossier-footer">
          <p>Document généré par <strong>OrientaPro</strong> — gratuit, sans inscription. Ne remplace pas un conseil personnalisé.</p>
        </footer>
      </div>
    `;
  }

  function stadeDescription(stade) {
    const n = (stade || "").toLowerCase();
    if (n.includes("idée") || n === "idee") return "Vous avez une idée d'entreprise. Vous cherchez à comprendre les premières étapes et à structurer votre projet.";
    if (n.includes("étude")) return "Votre projet est en cours d'étude. Vous validez votre marché, votre offre et vos besoins de financement.";
    if (n.includes("prêt") || n.includes("pret")) return "Votre projet est prêt à être lancé. Vous formalisez votre statut juridique et vos premiers contrats.";
    if (n.includes("déjà") || n.includes("deja")) return "Votre entreprise est déjà lancée. Vous cherchez à la consolider et à accéder à des financements adaptés.";
    return "Vous êtes au tout début de votre démarche entrepreneuriale. C'est le bon moment pour vous faire accompagner.";
  }

  function explicationMatching(diag, items) {
    if (!items.length) return "Aucun programme n'a pu être proposé. Cela arrive parfois quand le profil est très spécifique. Une structure généraliste comme la CCI Val-d'Oise pourra vous orienter.";
    const parts = [];
    if (diag.rqth) parts.push("votre reconnaissance RQTH ouvre l'accès à des dispositifs AGEFIPH dédiés");
    if (diag.qpv) parts.push("votre résidence en quartier prioritaire ouvre des prêts d'honneur et accompagnements dédiés");
    parts.push(`votre projet est au stade « ${(diag.maturiteProjet || "à préciser").toLowerCase()} »`);
    if (diag.besoinPrincipal) parts.push(`vos besoins portent principalement sur « ${diag.besoinPrincipal.toLowerCase()} »`);
    if (diag.region) parts.push(`votre territoire est ${diag.region}`);
    return "Ces programmes ont été sélectionnés parce que " + parts.join(", ") + ".";
  }

  function computeDocuments(diag, items) {
    const docs = new Set([
      "Une présentation écrite de votre projet (1 à 2 pages suffisent)",
      "Une pièce d'identité",
      "Un justificatif de domicile récent",
    ]);
    if (diag.rqth) docs.add("Votre notification RQTH (Maison Départementale des Personnes Handicapées)");
    if (diag.qpv) docs.add("Un justificatif d'adresse en QPV (consultez https://sig.ville.gouv.fr)");
    if ((diag.statutActuel || "").toLowerCase().includes("demandeur")) docs.add("Une attestation France Travail récente");
    if ((diag.maturiteProjet || "").toLowerCase().includes("étude") || (diag.maturiteProjet || "").toLowerCase().includes("structur")) {
      docs.add("Une ébauche de business plan ou prévisionnel financier (même partiel)");
    }
    if ((diag.maturiteProjet || "").toLowerCase().includes("créa") || (diag.maturiteProjet || "").toLowerCase().includes("crea")) {
      docs.add("Un extrait Kbis ou un projet de statuts");
    }
    // Documents spécifiques au programme #1 si renseignés
    if (items[0] && Array.isArray(items[0].documentsAttendus)) {
      items[0].documentsAttendus.forEach(d => docs.add(d));
    }
    return Array.from(docs);
  }

  function computeProchainesEtapes(diag, items) {
    const top = items[0];
    const steps = [];
    if (top && top.structure) {
      steps.push(`Contacter ${top.structure.nom} (${top.contactLabel || top.contact || "voir contact ci-dessus"}) cette semaine`);
    } else {
      steps.push("Contacter la CCI Val-d'Oise au 01 30 75 35 35 pour un premier rendez-vous");
    }
    steps.push("Préparer les documents listés ci-dessus");
    steps.push("Envoyer le message d'introduction (section 10) avec ce dossier en pièce jointe");
    if ((diag.echeance || "").toLowerCase().includes("urgent")) {
      steps.push("Demander un rendez-vous sous 7 jours en mentionnant votre échéance");
    } else {
      steps.push("Demander un premier rendez-vous (en présentiel ou visio)");
    }
    steps.push("Préparer 3 questions à poser lors du rendez-vous (financement, durée, suite du parcours)");
    return steps;
  }

  // ----- Navigation vers la screen Dossier ------------------------

  function openDossier() {
    const diag = getLatestDiag();
    const container = document.getElementById("dossier-container");
    if (!container) {
      console.warn("[dossier] container introuvable — assure-toi que <section data-screen=\"dossier\">…</section> existe");
      return;
    }
    container.innerHTML = renderDossier(diag);
    // Bascule d'écran
    if (typeof go === "function") {
      go("dossier");
    } else {
      // Fallback : montre la section manuellement
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      const target = document.querySelector('[data-screen="dossier"]');
      if (target) target.classList.add("active");
    }
    trackIfPossible("dossier_generated", { hasDiag: !!diag });
    bindDossierActions(diag);
  }

  // ----- Actions PDF / Print / Copier -----------------------------

  function bindDossierActions(diag) {
    const btnPdf = document.getElementById("dossier-download-pdf");
    const btnPrint = document.getElementById("dossier-print");
    const btnCopy = null; // Bouton "Copier le message" remplacé par "Transférer à la structure" (géré par transfert-modal.js)
    const feedback = document.getElementById("dossier-copy-feedback");

    if (btnPdf) btnPdf.addEventListener("click", () => generatePdf(diag));
    if (btnPrint) btnPrint.addEventListener("click", () => {
      trackIfPossible("dossier_print");
      window.print();
    });
    if (btnCopy) btnCopy.addEventListener("click", async () => {
      const msgEl = document.getElementById("dossier-message-text");
      if (!msgEl) return;
      const text = msgEl.textContent;
      try {
        await navigator.clipboard.writeText(text);
        if (feedback) feedback.textContent = "✓ Message copié dans le presse-papiers";
        trackIfPossible("dossier_message_copied");
      } catch (_) {
        // Fallback : sélection manuelle
        const range = document.createRange();
        range.selectNode(msgEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        if (feedback) feedback.textContent = "Sélectionnez et copiez le message ci-dessus (Ctrl+C)";
      }
      setTimeout(() => { if (feedback) feedback.textContent = ""; }, 4000);
    });
  }

  function generatePdf(diag) {
    if (!diag) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.warn("[dossier] jsPDF non disponible — fallback impression");
      window.print();
      return;
    }
    trackIfPossible("dossier_pdf_downloaded");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const lineH = 14;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = margin;

    function addLine(text, opts) {
      opts = opts || {};
      const fontSize = opts.size || 11;
      const isBold = opts.bold || false;
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const wrapped = doc.splitTextToSize(text, pageW - 2 * margin);
      wrapped.forEach(w => {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(w, margin, y);
        y += lineH * (fontSize / 11);
      });
    }

    function addH(text, size) { addLine(text, { size: size || 14, bold: true }); y += 4; }

    // Page de titre
    addH("Dossier Passerelle OrientaPro", 18);
    y += 6;
    addLine("Document généré pour préparer un premier rendez-vous d'accompagnement entrepreneurial.", { size: 10 });
    addLine(`Date : ${new Date().toLocaleDateString("fr-FR")}`, { size: 10 });
    y += 12;

    addH("1. Qui je suis", 13);
    addLine(`Tranche d'âge : ${safe(diag.trancheAge)}`);
    addLine(`Statut actuel : ${safe(diag.statutActuel)}`);
    if (diag.rqth) addLine("Reconnaissance RQTH");
    if (diag.qpv) addLine("Résident QPV (Quartier Prioritaire de la Ville)");

    y += 6;
    addH("2. Où je suis", 13);
    addLine(`Région : ${safe(diag.region)}`);
    if (diag.ville) addLine(`Ville : ${diag.ville}`);

    y += 6;
    addH("3. Mon projet", 13);
    addLine(`Secteur : ${safe(diag.secteurProjet)}`);
    addLine(`Stade : ${safe(diag.maturiteProjet)}`);
    if (diag.descriptionProjet) addLine(`Description : ${diag.descriptionProjet}`);

    y += 6;
    addH("4. Mon niveau d'avancement", 13);
    addLine(stadeDescription(diag.maturiteProjet));

    y += 6;
    addH("5. Mes besoins prioritaires", 13);
    addLine(`Besoin principal : ${safe(diag.besoinPrincipal)}`);
    if (diag.blocagePrincipal) addLine(`Blocage : ${diag.blocagePrincipal}`);
    if (diag.echeance) addLine(`Échéance : ${diag.echeance}`);

    y += 6;
    addH("6. Programmes recommandés", 13);
    const matchedItems = (diag.programmesMatched || []).slice(0, 3);
    matchedItems.forEach((m, i) => {
      const p = findProgramme(m.id) || {};
      const s = findStructure(p.structureId) || {};
      addLine(`#${i+1} — ${s.nom || ""} : ${p.nom || ""} (${m.score}/100)`, { bold: true });
      if (p.description) addLine(p.description);
      if (m.raisons && m.raisons.length) {
        addLine("Pourquoi ce programme :", { size: 10, bold: true });
        m.raisons.forEach(r => addLine("• " + r, { size: 10 }));
      }
      y += 4;
    });

    y += 4;
    addH("7. Pourquoi ces programmes", 13);
    addLine(explicationMatching(diag, matchedItems.map(m => Object.assign({}, findProgramme(m.id) || {}, m))));

    y += 6;
    addH("8. Documents à préparer", 13);
    computeDocuments(diag, matchedItems.map(m => findProgramme(m.id) || {})).forEach(d => addLine("• " + d));

    y += 6;
    addH("9. Mes prochaines étapes", 13);
    computeProchainesEtapes(diag, matchedItems.map(m => findProgramme(m.id) || {})).forEach((p, i) => addLine(`${i+1}. ${p}`));

    y += 8;
    addH("10. Message prêt à envoyer", 13);
    const topName = matchedItems[0] ? (findStructure((findProgramme(matchedItems[0].id) || {}).structureId) || {}).nom || "" : "";
    const msg = buildMessage(diag, topName);
    msg.split("\n").forEach(line => addLine(line));

    doc.save(`Dossier-Passerelle-OrientaPro-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Expose pour usage depuis index.html (boutons "Voir mon dossier", "Préparer mon dossier")
  window.OrientaProDossier = { open: openDossier, render: renderDossier };
})();
