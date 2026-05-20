// assets/chat-widget.js — Widget chatbot Q&A flottant
// Repose sur window.OrientaProRAG (rag-client.js). Vanilla JS, accessible WCAG 2.1 AA.

(function () {
  const rag = window.OrientaProRAG;
  const cfg = window.ORIENTAPRO_CONFIG || {};
  // Le widget reste actif même sans API : bascule sur un mode local fictif.
  if (cfg.ENABLED === false) {
    console.info("[Chat Widget] désactivé via config");
    return;
  }
  if (!rag || !rag.available()) {
    console.info("[Chat Widget] API absente — mode local activé");
  }

  // === Mode local — réponses déterministes à partir du catalogue ===========
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function detectIntent(text) {
    const t = normalize(text);
    return {
      rqth: /\b(rqth|handicap|tih|invalidite|agefiph)\b/.test(t),
      qpv: /\b(qpv|quartier|garges|sarcelles|villiers|gonesse|goussainville|carpf|val.?d.?oise)\b/.test(t),
      financement: /\b(finan|argent|pret|microcredit|subvention|aide|euros?|nacre|arce|acre)\b/.test(t),
      formation: /\b(formation|coaching|atelier|bootcamp|mentor|cours)\b/.test(t),
      reseau: /\b(reseau|club|communaute|mentor)\b/.test(t),
      test: /\b(test|couveuse|coopera|essai)\b/.test(t),
      femme: /\b(femme|creatrice|entrepreneure)\b/.test(t),
      jeune: /\b(jeune|moins de 32|25 ans|26 ans|moins de 30)\b/.test(t),
      demandeurEmploi: /\b(demandeur|chomeur|chomage|france travail|pole emploi)\b/.test(t),
    };
  }
  function scoreProgramme(prog, intent) {
    let score = 0;
    const publics = (prog.publicsCibles || []).map(normalize).join(" ") + " " + normalize(prog.ciblePublic || "");
    const desc = normalize((prog.description || "") + " " + (prog.nom || "") + " " + ((prog.tags || []).join(" ")));
    if (intent.rqth && publics.includes("rqth")) score += 30;
    if (intent.qpv && publics.includes("qpv")) score += 25;
    if (intent.femme && publics.includes("femme")) score += 20;
    if (intent.jeune && publics.includes("jeune")) score += 15;
    if (intent.demandeurEmploi && publics.includes("demandeur")) score += 15;
    if (intent.financement && /finan|pret|microcredit|subvention|garantie|nacre|arce|acre/.test(desc)) score += 18;
    if (intent.formation && /formation|atelier|parcours|bootcamp|mentor|coaching/.test(desc)) score += 15;
    if (intent.reseau && /reseau|mentor|club|communaute/.test(desc)) score += 12;
    if (intent.test && /test|couveuse|coopera/.test(desc)) score += 12;
    if (score === 0 && publics.includes("tous")) score = 3;
    return score;
  }
  function buildLocalAnswer(message) {
    if (!window.PROGRAMMES || !window.STRUCTURES) {
      return {
        answer_falc: "Je n'ai pas encore chargé le catalogue. Réessayez dans quelques secondes ou contactez Initiactive 95 au 01 39 88 11 99.",
        sources: [],
      };
    }
    const intent = detectIntent(message);
    const scored = window.PROGRAMMES.map(p => ({ p, s: scoreProgramme(p, intent) }))
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    if (scored.length === 0) {
      return {
        answer_falc: "Je n'ai pas trouvé d'aide précise pour votre question. Voici 2 contacts gratuits qui peuvent vous aider :\n\n• Initiactive 95 (prêts d'honneur Val-d'Oise) : 01 39 88 11 99\n• CCI Val-d'Oise (accompagnement création) : 01 30 75 35 35\n\nVous pouvez aussi remplir le diagnostic complet pour des recommandations personnalisées.",
        sources: [
          { nom: "Initiactive 95", lien: "https://www.initiactive95.com/" },
          { nom: "CCI Val-d'Oise", lien: "https://www.cci-paris-idf.fr/fr/cci-val-doise" },
        ],
      };
    }
    const lignes = ["Voici ce que je trouve dans notre catalogue pour votre question :"];
    scored.forEach((x, i) => {
      const p = x.p;
      const s = window.STRUCTURES.find(st => st.id === p.structureId) || {};
      const orga = p.organisme || s.nom || "";
      lignes.push("");
      lignes.push(`${i + 1}. ${p.nom}${orga ? " (" + orga + ")" : ""}`);
      lignes.push(`   Pour qui ? ${(p.publicsCibles || []).join(", ") || p.ciblePublic || "Tous publics"}.`);
      lignes.push(`   Montant : ${p.montant || p.cout || "À voir avec la structure"}.`);
      if (p.contactLabel || p.contact) lignes.push(`   Contact : ${p.contactLabel || p.contact}.`);
    });
    lignes.push("");
    lignes.push("Pour une orientation complète, faites le diagnostic gratuit ci-dessus. Cela génère un dossier prêt à présenter.");
    const sources = scored.map(x => {
      const p = x.p;
      const s = window.STRUCTURES.find(st => st.id === p.structureId) || {};
      return {
        nom: p.nom + (s.nom ? " — " + s.nom : ""),
        lien: p.contactUrl || (s.email ? "mailto:" + s.email : "#"),
      };
    });
    return { answer_falc: lignes.join("\n"), sources };
  }

  const SUGGESTIONS = [
    "Je suis RQTH à Garges. Quelles aides puis-je toucher ?",
    "Comment obtenir l'ARCE quand on est demandeur d'emploi ?",
    "Qu'est-ce que le prêt d'honneur Initiactive 95 ?",
    "Quartiers 2030, c'est pour qui exactement ?",
  ];

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, ch => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) node.setAttribute(k, "");
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ============================================================
  // DOM
  // ============================================================

  const fab = el("button", {
    class: "op-chat-fab",
    id: "op-chat-fab",
    type: "button",
    "aria-label": "Ouvrir l'assistant OrientaPro pour poser une question",
    "aria-expanded": "false",
    "aria-controls": "op-chat-panel",
  });
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>Poser une question</span>';

  const closeBtn = el("button", {
    class: "op-chat-close",
    id: "op-chat-close",
    type: "button",
    "aria-label": "Fermer l'assistant",
  }, ["×"]);

  const header = el("header", { class: "op-chat-header" }, [
    el("div", { class: "op-chat-header-title", id: "op-chat-title" }, [
      "Assistant OrientaPro",
      el("span", { class: "op-chat-header-sub" }, ["Aides, structures, démarches — sources citées"]),
    ]),
    closeBtn,
  ]);

  const body = el("div", {
    class: "op-chat-body",
    id: "op-chat-body",
    role: "log",
    "aria-live": "polite",
    "aria-atomic": "false",
    "aria-label": "Historique de conversation",
  });

  const intro = el("div", { class: "op-chat-intro" }, [
    el("strong", null, ["Bonjour 👋"]),
    document.createTextNode(" Posez-moi une question sur les aides ou les démarches. Je m'appuie sur des sources publiques officielles (AGEFIPH, Bpifrance, ANCT, Initiactive 95...) et je cite chaque source."),
    el("div", { class: "op-chat-suggestions", role: "group", "aria-label": "Exemples de questions" },
      SUGGESTIONS.map(q => el("button", {
        class: "op-chat-suggestion",
        type: "button",
        onclick: () => submit(q),
      }, [q]))
    ),
  ]);
  body.appendChild(intro);

  const input = el("textarea", {
    class: "op-chat-input",
    id: "op-chat-input",
    rows: "1",
    "aria-label": "Posez votre question",
    placeholder: "Posez votre question…",
    maxlength: "500",
  });

  const sendBtn = el("button", {
    class: "op-chat-send",
    id: "op-chat-send",
    type: "button",
    "aria-label": "Envoyer la question",
  });
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  const inputRow = el("div", { class: "op-chat-input-row" }, [input, sendBtn]);

  const disclaimer = el("p", { class: "op-chat-disclaimer" }, [
    "Réponses générées par Mistral AI (souverain FR) sur la base de sources publiques. Informations indicatives — confirmez auprès de votre structure d'accompagnement.",
  ]);

  const panel = el("section", {
    class: "op-chat-panel",
    id: "op-chat-panel",
    role: "dialog",
    "aria-labelledby": "op-chat-title",
    "aria-modal": "false",
    hidden: true,
  }, [header, body, inputRow, disclaimer]);

  function mount() {
    document.body.appendChild(fab);
    document.body.appendChild(panel);
  }

  // ============================================================
  // Interactions
  // ============================================================

  function open() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }
  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input.value);
    }
  });
  sendBtn.addEventListener("click", () => submit(input.value));

  function appendUser(text) {
    const node = el("div", { class: "op-msg op-msg-user" }, [text]);
    body.appendChild(node);
    body.scrollTop = body.scrollHeight;
  }

  function appendBot(text, sources) {
    const textNode = el("div", { class: "op-msg-text" }, [text]);
    const wrap = el("div", { class: "op-msg op-msg-bot" }, [textNode]);
    if (sources && sources.length) {
      const sNode = el("div", { class: "op-msg-sources" }, [
        el("strong", null, ["Sources :"]),
        el("ol", null, sources.map(s => el("li", null, [
          s.lien
            ? el("a", { href: s.lien, target: "_blank", rel: "noopener" }, [s.nom])
            : document.createTextNode(s.nom),
        ]))),
      ]);
      wrap.appendChild(sNode);
    }
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function appendBotBusy() {
    const textNode = el("div", { class: "op-msg-text" }, ["Je cherche dans les sources officielles…"]);
    const wrap = el("div", { class: "op-msg op-msg-bot", "aria-busy": "true" }, [textNode]);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    return wrap;
  }

  function appendError(message) {
    const node = el("div", { class: "op-msg op-msg-bot is-error" }, [
      "Désolé, je ne peux pas répondre pour l'instant : ",
      message || "service indisponible.",
      " Vous pouvez contacter Initiactive 95 au 01 39 88 11 99 ou la CCI Val-d'Oise au 01 30 75 35 35.",
    ]);
    body.appendChild(node);
    body.scrollTop = body.scrollHeight;
  }

  let busy = false;
  async function submit(rawText) {
    const text = (rawText || "").trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "auto";
    intro.hidden = true;
    appendUser(text);
    const busyNode = appendBotBusy();
    let res = null;
    // 1) Tente l'API souveraine Mistral si configurée
    if (rag && rag.available()) {
      try {
        res = await rag.chat({ message: text });
      } catch (_) {
        res = null;
      }
    }
    // 2) Fallback local : 100 % déterministe à partir du catalogue
    if (!res) {
      try {
        res = buildLocalAnswer(text);
      } catch (e) {
        res = null;
      }
    }
    busyNode.remove();
    if (res) {
      appendBot(res.answer_falc || "Je n'ai pas trouvé d'information précise.", res.sources || []);
      if (window.trackEvent) window.trackEvent("chat_question_asked", { hasSources: (res.sources || []).length > 0 });
    } else {
      appendError("Service temporairement indisponible.");
    }
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
