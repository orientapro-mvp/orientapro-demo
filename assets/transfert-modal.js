// assets/transfert-modal.js — Modale "Transférer à la structure"
// MVP fictif : aucune transmission réelle, exports locaux (Blob + download).
// 7 formats : PDF, CSV, XLSX (simulé), JSON, XML, vCard, Webhook (simulé).

(function () {
  const WORDING = "MVP de démonstration — données, structures, événements et partenaires fictifs. Aucun partenariat réel n'a été conclu et aucune donnée n'est transmise.";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function track(n, p) { if (window.trackEvent) window.trackEvent(n, p); }

  // === Récupération du dossier courant ===
  function getCurrentDiag() {
    if (typeof DIAGNOSTICS === "undefined" || !DIAGNOSTICS.length) return null;
    return DIAGNOSTICS[0];
  }

  function buildDossierData(diag) {
    if (!diag) return null;
    const matched = (diag.programmesMatched || []).slice(0, 3);
    const progs = matched.map(m => {
      const p = (window.PROGRAMMES || []).find(x => x.id === m.id);
      const s = p && (window.STRUCTURES || []).find(x => x.id === p.structureId);
      return p ? { nom: p.nom, score: m.score, structure: s ? s.nom : "", organisme: p.organisme || (s ? s.nom : "") } : null;
    }).filter(Boolean);
    return {
      bénéficiaire: diag.porteurAlias || "Anonyme",
      profil: {
        tranche_age: diag.trancheAge || "",
        statut: diag.statutActuel || "",
        rqth: !!diag.rqth,
        qpv: !!diag.qpv,
        region: diag.region || "",
        ville: diag.ville || "",
      },
      projet: {
        secteur: diag.secteurProjet || "",
        maturite: diag.maturiteProjet || "",
        description: diag.descriptionProjet || "",
        besoin: diag.besoinPrincipal || "",
      },
      programmes_recommandes: progs,
      genere_le: new Date().toISOString(),
      _mention: "MVP de démonstration · données fictives",
    };
  }

  // === Exporters ===
  function blobDL(content, mime, filename) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function exportCSV(d) {
    const headers = ["bénéficiaire", "tranche_age", "statut", "rqth", "qpv", "region", "ville", "secteur", "maturite", "besoin", "programme_1", "programme_2", "programme_3"];
    const row = [
      d.bénéficiaire, d.profil.tranche_age, d.profil.statut, d.profil.rqth ? "oui" : "non", d.profil.qpv ? "oui" : "non",
      d.profil.region, d.profil.ville, d.projet.secteur, d.projet.maturite, d.projet.besoin,
      (d.programmes_recommandes[0] || {}).nom || "",
      (d.programmes_recommandes[1] || {}).nom || "",
      (d.programmes_recommandes[2] || {}).nom || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    const csv = headers.join(";") + "\n" + row.join(";");
    blobDL(csv, "text/csv", `dossier-orientapro-${Date.now()}.csv`);
  }

  function exportJSON(d) {
    blobDL(JSON.stringify(d, null, 2), "application/json", `dossier-orientapro-${Date.now()}.json`);
  }

  function exportXML(d) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dossier mention="MVP de démonstration - données fictives">
  <beneficiaire>${escapeXml(d.bénéficiaire)}</beneficiaire>
  <profil>
    <tranche_age>${escapeXml(d.profil.tranche_age)}</tranche_age>
    <statut>${escapeXml(d.profil.statut)}</statut>
    <rqth>${d.profil.rqth}</rqth>
    <qpv>${d.profil.qpv}</qpv>
    <region>${escapeXml(d.profil.region)}</region>
  </profil>
  <projet>
    <secteur>${escapeXml(d.projet.secteur)}</secteur>
    <maturite>${escapeXml(d.projet.maturite)}</maturite>
    <besoin>${escapeXml(d.projet.besoin)}</besoin>
  </projet>
  <programmes>
    ${d.programmes_recommandes.map(p => `<programme><nom>${escapeXml(p.nom)}</nom><score>${p.score}</score><structure>${escapeXml(p.structure)}</structure></programme>`).join("\n    ")}
  </programmes>
</dossier>`;
    blobDL(xml, "application/xml", `dossier-orientapro-${Date.now()}.xml`);
  }

  function escapeXml(s) {
    return String(s || "").replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
  }

  function exportVCard(d, email) {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:${d.bénéficiaire}
NOTE:Projet : ${d.projet.secteur || "—"} · Stade : ${d.projet.maturite || "—"} · Besoin : ${d.projet.besoin || "—"}. Dossier OrientaPro fictif (MVP de démonstration).
${email ? "EMAIL;TYPE=internet:" + email : ""}
CATEGORIES:OrientaPro,MVP-demo
END:VCARD`;
    blobDL(vcf, "text/vcard", `contact-orientapro-${Date.now()}.vcf`);
  }

  function exportPDF(d) {
    if (window.OrientaProDossier && typeof window.OrientaProDossier.open === "function") {
      // On peut déclencher la génération PDF via le module dossier-passerelle si dispo
      const diag = getCurrentDiag();
      if (diag && window.jspdf && window.jspdf.jsPDF) {
        // Force le générateur PDF existant
        const event = new CustomEvent("op-pdf-export", { detail: { diag } });
        window.dispatchEvent(event);
        // Fallback : si le générateur n'est pas connecté, on génère un PDF minimal ici
        setTimeout(() => generateFallbackPDF(d), 200);
        return;
      }
    }
    generateFallbackPDF(d);
  }

  function generateFallbackPDF(d) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Le module PDF n'est pas chargé. Le format CSV ou JSON est disponible immédiatement.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 50;
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Dossier Passerelle OrientaPro", 48, y); y += 26;
    doc.setFontSize(10); doc.setFont("helvetica", "italic");
    doc.text("MVP de démonstration · données fictives", 48, y); y += 22;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const lines = [
      `Bénéficiaire : ${d.bénéficiaire}`,
      `Profil : ${d.profil.tranche_age} ans · ${d.profil.statut}${d.profil.rqth ? " · RQTH" : ""}${d.profil.qpv ? " · QPV" : ""}`,
      `Territoire : ${d.profil.region} ${d.profil.ville ? "· " + d.profil.ville : ""}`,
      `Projet : ${d.projet.secteur} · ${d.projet.maturite}`,
      `Besoin principal : ${d.projet.besoin}`,
      "",
      "Programmes recommandés :",
    ];
    lines.forEach(line => { doc.text(line, 48, y); y += 16; });
    d.programmes_recommandes.forEach((p, i) => {
      doc.text(`${i + 1}. ${p.nom} (${p.organisme || p.structure || ""}) — ${p.score}/100`, 60, y);
      y += 16;
    });
    doc.save(`dossier-orientapro-${Date.now()}.pdf`);
  }

  function exportXLSX() {
    alert("📊 Export XLSX disponible en V2.\n\nLe format CSV équivalent est téléchargeable en un clic — il s'ouvre directement dans Excel.");
  }

  function simulateWebhook(d, structureNom, email) {
    const payload = {
      event: "dossier.transfere",
      target: structureNom,
      email_referent: email,
      dossier: d,
      timestamp: new Date().toISOString(),
    };
    console.log("[MVP] Simulation Webhook POST →", payload);
    alert(`🔗 Simulation API Webhook\n\nPOST https://crm.exemple.fr/webhook/orientapro\nDestinataire : ${structureNom}\nRéponse simulée : 200 OK\n\nMVP de démonstration — aucun appel HTTP réel n'a été effectué. Voir la console pour le payload.`);
  }

  // === Modale ===
  function fillStructureOptions() {
    const select = $("#tr-structure");
    if (!select) return;
    // Vide les options existantes sauf le placeholder
    while (select.options.length > 1) select.remove(1);
    const structs = window.STRUCTURES || [];
    structs.forEach(s => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = `${s.nom}${s.ville ? " — " + s.ville : ""}`;
      select.appendChild(opt);
    });
  }

  function fillSummary(d) {
    if (!d) return;
    const tr = (id, v) => { const el = $(id); if (el) el.textContent = v || "—"; };
    tr("#tr-resume-nom", d.bénéficiaire);
    tr("#tr-resume-profil", `${d.profil.tranche_age || ""} ${d.profil.rqth ? "· RQTH " : ""}${d.profil.qpv ? "· QPV " : ""}${d.profil.statut || ""}`.trim());
    tr("#tr-resume-projet", `${d.projet.secteur || "—"}${d.projet.maturite ? " · " + d.projet.maturite : ""}`);
    const ul = $("#tr-resume-programmes");
    if (ul) {
      ul.innerHTML = "";
      d.programmes_recommandes.forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.nom}${p.organisme ? " (" + p.organisme + ")" : ""} — ${p.score}/100`;
        ul.appendChild(li);
      });
      if (!d.programmes_recommandes.length) {
        ul.innerHTML = "<li><em>Pas de programme recommandé encore — complétez le diagnostic.</em></li>";
      }
    }
  }

  function openTransferer() {
    const modal = $("#modal-transferer");
    if (!modal) return;
    // Reset
    const form = $("#transfert-form"); if (form) { form.hidden = false; form.reset(); }
    const conf = $("#transfert-confirmation"); if (conf) conf.hidden = true;
    $$(".op-tr-error").forEach(e => { e.textContent = ""; e.hidden = true; });
    $$("#transfert-form .format-btn").forEach(b => b.classList.remove("is-selected"));
    // Remplir options + résumé
    fillStructureOptions();
    fillSummary(buildDossierData(getCurrentDiag()));
    // Ouvrir
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => { const s = $("#tr-structure"); if (s) s.focus(); }, 50);
    track("transferer_modal_opened");
  }

  function closeTransferer() {
    const modal = $("#modal-transferer");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  // État du format choisi
  let selectedFormat = null;
  function selectFormat(btn) {
    $$("#transfert-form .format-btn").forEach(b => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    selectedFormat = btn.dataset.format;
  }

  function setError(field, message) {
    const err = field.parentElement.querySelector(".op-tr-error");
    if (err) { err.textContent = message || ""; err.hidden = !message; }
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validateTransfert(data) {
    const errs = {};
    if (!data.structureId) errs.structure = "Sélectionnez la structure destinataire.";
    if (!data.email) errs.email = "Veuillez saisir une adresse e-mail pour transmettre le dossier.";
    else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(data.email)) errs.email = "Veuillez saisir une adresse e-mail valide.";
    if (!data.format) errs.format = "Choisissez un format d'export ci-dessous.";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const structureId = parseInt(fd.get("structure") || "0", 10);
    const data = {
      structureId,
      email: (fd.get("email") || "").trim(),
      newsletter: !!fd.get("newsletter"),
      format: selectedFormat,
    };
    $$(".op-tr-error", form).forEach(el => { el.textContent = ""; el.hidden = true; });
    $$("[name]", form).forEach(el => el.removeAttribute("aria-invalid"));

    const errs = validateTransfert(data);
    if (Object.keys(errs).length) {
      if (errs.structure) setError($("#tr-structure"), errs.structure);
      if (errs.email) setError($("#tr-email"), errs.email);
      if (errs.format) {
        const grid = $(".op-tr-formats-grid");
        const err = $("#tr-format-error");
        if (err) { err.textContent = errs.format; err.hidden = false; }
      }
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    const structure = (window.STRUCTURES || []).find(s => s.id === structureId);
    const dossier = buildDossierData(getCurrentDiag());
    if (!dossier) {
      alert("Aucun dossier disponible. Complétez d'abord le diagnostic.");
      return;
    }

    // Lance l'export selon le format
    switch (data.format) {
      case "pdf": exportPDF(dossier); break;
      case "csv": exportCSV(dossier); break;
      case "xlsx": exportXLSX(); break;
      case "json": exportJSON(dossier); break;
      case "xml": exportXML(dossier); break;
      case "vcard": exportVCard(dossier, data.email); break;
      case "webhook": simulateWebhook(dossier, structure ? structure.nom : "structure", data.email); break;
    }

    // Enregistrement local
    try {
      const all = JSON.parse(localStorage.getItem("orientapro_transferts") || "[]");
      all.push({ structure: structure ? structure.nom : "?", email: data.email, format: data.format, newsletter: data.newsletter, ts: new Date().toISOString() });
      localStorage.setItem("orientapro_transferts", JSON.stringify(all));
    } catch (_) {}

    track("dossier_transferred", { format: data.format, newsletter: data.newsletter });

    // Affichage de la confirmation
    if (form) form.hidden = true;
    const conf = $("#transfert-confirmation");
    if (conf) {
      conf.hidden = false;
      const nameEl = $("#tr-conf-structure"); if (nameEl) nameEl.textContent = structure ? structure.nom : "—";
      const fmtEl = $("#tr-conf-format"); if (fmtEl) fmtEl.textContent = labelForFormat(data.format);
      const emailEl = $("#tr-conf-email"); if (emailEl) emailEl.textContent = data.email;
      const newsEl = $("#tr-conf-newsletter"); if (newsEl) newsEl.textContent = data.newsletter ? "Oui" : "Non";
      conf.setAttribute("tabindex", "-1");
      conf.focus();
    }

    // Mise à jour du statut "Transféré à la structure" dans le DOM du dossier
    document.querySelectorAll("[data-dossier-status]").forEach(el => {
      el.textContent = "✓ Transféré à la structure";
      el.classList.add("is-transferred");
    });
  }

  function labelForFormat(f) {
    return ({ pdf: "PDF", csv: "CSV", xlsx: "XLSX (simulation)", json: "JSON", xml: "XML", vcard: "vCard", webhook: "Webhook API (simulation)" }[f]) || f;
  }

  function bind() {
    // Boutons d'ouverture
    $$('[data-open="transferer"]').forEach(b => b.addEventListener("click", openTransferer));
    // Fermeture
    $$('#modal-transferer [data-close-transferer]').forEach(b => b.addEventListener("click", closeTransferer));
    const modal = $("#modal-transferer");
    if (modal) modal.addEventListener("click", e => { if (e.target === modal) closeTransferer(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        const m = $("#modal-transferer");
        if (m && m.classList.contains("open")) closeTransferer();
      }
    });
    // Form submit
    const form = $("#transfert-form");
    if (form) form.addEventListener("submit", handleSubmit);
    // Boutons format
    $$("#transfert-form .format-btn").forEach(b => b.addEventListener("click", () => selectFormat(b)));
  }

  window.openTransfererModal = openTransferer;
  window.closeTransfererModal = closeTransferer;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
