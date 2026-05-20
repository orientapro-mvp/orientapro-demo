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

  // === FAQ MVP — répond AVANT le matching catalogue =========================
  // Réponses courtes, claires, ton professionnel.
  // Pas de "appelez X" sauf si l'utilisateur demande explicitement un contact humain.
  const FAQ_MVP = [
    {
      patterns: [/comment\s+(ca|cela)\s+marche/, /comment\s+fonctionne/, /c.est\s+quoi\s+orientapro/, /a\s+quoi\s+sert/, /presentation/],
      answer: "OrientaPro vous accompagne en 3 étapes : un diagnostic gratuit en quelques minutes, des recommandations de programmes d'accompagnement adaptés à votre profil, et un dossier prêt à transmettre. C'est un MVP de démonstration : cliquez sur « Préparer mon dossier gratuit » pour voir le parcours.",
    },
    {
      patterns: [/c.est\s+gratuit/, /combien.{0,15}cout/, /payant/, /prix/, /tarif/],
      answer: "Le diagnostic et la recommandation sont 100 % gratuits. L'accompagnement passe ensuite par des structures publiques (BGE, ADIE, Cap Emploi). Aucune création de compte n'est requise.",
    },
    {
      patterns: [/qui\s+(est|etes).{0,20}derriere/, /qui\s+a\s+fait/, /qui\s+porte/, /equipe/],
      answer: "OrientaPro est un projet d'orientation entrepreneuriale inclusive pour les publics RQTH et QPV. Le présent site est un MVP de démonstration en cours de validation.",
    },
    {
      patterns: [/je\s+suis\s+porteur/, /pour\s+les\s+porteurs/, /profil\s+porteur/],
      answer: "Oui, OrientaPro est fait pour vous. Cliquez sur « Préparer mon dossier gratuit » en haut de page pour démarrer votre diagnostic en 15 minutes.",
    },
    {
      patterns: [/je\s+suis\s+(une\s+)?structure/, /pour\s+les\s+structures/, /pour\s+les\s+(bge|adie|conseillers)/, /accompagnant/],
      answer: "Basculez en mode « Côté Structures » via le sélecteur tout en haut. Vous accédez à un espace dédié aux conseillers : suivi de dossiers, KPIs, catalogue de programmes.",
    },
    {
      patterns: [/reserver.{0,20}pilote/, /place\s+pilote/, /pilote\s+2026/, /inscription\s+pilote/, /comment.{0,10}m.inscrire/],
      answer: "Cliquez sur « Réserver ma place pilote » : un formulaire en 30 secondes (nom, e-mail, rôle). MVP de démonstration : la demande est enregistrée localement dans votre navigateur. Aucune transmission externe.",
    },
    {
      patterns: [/exemple.{0,15}dossier/, /voir.{0,10}exemple/, /demo.{0,10}dossier/, /apercu\s+dossier/],
      answer: "Cliquez sur « Voir un exemple de dossier » dans le hero. Vous découvrirez un Dossier Passerelle fictif (Fatou D., projet salon de coiffure) avec les 10 sections types qu'une structure d'accompagnement reçoit.",
    },
    {
      patterns: [/partenaire/, /partenariat/, /collaboration/, /reel/],
      answer: "MVP de démonstration : tous les partenaires, événements et chiffres affichés sont illustratifs. Aucun partenariat réel n'a été conclu à ce stade. L'objectif est uniquement de présenter le fonctionnement du projet.",
    },
    {
      patterns: [/fictif/, /vrai|reel/, /vraiment/, /demo|demonstr/, /test/],
      answer: "Oui, c'est un MVP de démonstration : données, structures, événements et partenaires affichés sont fictifs. Le parcours fonctionnel est réel et présentable, mais aucune donnée n'est transmise à un serveur externe.",
    },
    {
      patterns: [/combien.{0,15}(temps|minutes)/, /duree.{0,10}diagnostic/, /diagnostic\s+(prend|dure)/],
      answer: "Le diagnostic prend environ 15 minutes (5 étapes, une douzaine de questions sur votre profil, votre projet, vos besoins). Vous pouvez le passer plus rapidement si vous connaissez déjà vos réponses.",
    },
    {
      patterns: [/apres\s+(le\s+)?diagnostic/, /que.{0,10}passe.{0,10}apres/, /ensuite/, /prochaine.{0,5}etape/],
      answer: "À la fin du diagnostic, vous recevez 3 programmes recommandés (avec score et raisons), une liste de documents à préparer, et un Dossier Passerelle prêt à transmettre à la structure de votre choix.",
    },
    {
      patterns: [/(mes\s+)?donnees\s+(sont|sont.{0,10}elles).{0,15}(securis|protege)/, /rgpd/, /confidentialite/, /vie\s+privee/, /stockage/],
      answer: "Vos réponses restent uniquement dans votre navigateur (localStorage). Aucune transmission à un serveur externe. Aucune création de compte. Détails complets dans la « Politique de confidentialité » en bas de page.",
    },
    {
      patterns: [/handicap|rqth|tih|oeth/],
      answer: "OrientaPro est spécialement conçu pour les personnes en situation de handicap (RQTH). Vous pouvez utiliser le mode FALC (Facile À Lire), le contraste élevé ou la lecture vocale via le bouton Accessibilité en haut à droite. Le diagnostic prend en compte votre situation pour identifier les aides AGEFIPH et les structures adaptées.",
    },
    {
      patterns: [/qpv|quartier|garges|sarcelles|villiers-le-bel|gonesse|carpf/],
      answer: "OrientaPro priorise les habitants des Quartiers Prioritaires de la Ville (QPV). Le diagnostic identifie automatiquement les dispositifs dédiés (Quartiers 2030, prêts d'honneur Initiative, accompagnement renforcé). Indiquez votre commune lors du diagnostic.",
    },
  ];

  function detectExplicitContactRequest(text) {
    const t = normalize(text);
    return /\b(numero|telephone|appeler|joindre|parler.{0,10}humain|contact\s+humain|conseiller|rendez.?vous|rdv)\b/.test(t);
  }

  function findFaqAnswer(query) {
    const t = normalize(query);
    if (!t || t.length < 3) return null;
    for (const item of FAQ_MVP) {
      for (const re of item.patterns) {
        if (re.test(t)) return item.answer;
      }
    }
    return null;
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
    // 1) D'abord la FAQ MVP — réponses directes aux questions fréquentes
    const faqAnswer = findFaqAnswer(message);
    if (faqAnswer) {
      return { answer_falc: faqAnswer, sources: [] };
    }

    if (!window.PROGRAMMES || !window.STRUCTURES) {
      return {
        answer_falc: "Le catalogue n'est pas encore chargé. Réessayez dans quelques secondes — ou faites le diagnostic gratuit pour découvrir le parcours complet.",
        sources: [],
      };
    }
    const intent = detectIntent(message);
    const scored = window.PROGRAMMES.map(p => ({ p, s: scoreProgramme(p, intent) }))
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    if (scored.length === 0) {
      // Si l'utilisateur demande explicitement un humain, on propose la réservation pilote
      // au lieu d'un numéro de téléphone.
      const wantsHuman = detectExplicitContactRequest(message);
      const baseMsg = wantsHuman
        ? "Pour échanger avec un humain dans le cadre du programme pilote, cliquez sur « Réserver ma place pilote » en haut de page (formulaire 30 secondes). MVP de démonstration : enregistrement local uniquement."
        : "Je n'ai pas trouvé d'aide précise pour votre question. Voici 3 actions utiles dans l'application :\n\n• Cliquez sur « Préparer mon dossier gratuit » pour un diagnostic personnalisé (15 min).\n• Cliquez sur « Voir un exemple de dossier » pour découvrir le format de livrable.\n• Réservez votre place pilote si vous souhaitez participer à la phase de test.";
      return { answer_falc: baseMsg, sources: [] };
    }
    // Réponse structurée — cards riches + texte fallback
    const cards = scored.map(x => {
      const p = x.p;
      const s = window.STRUCTURES.find(st => st.id === p.structureId) || {};
      const tel = (p.contact || p.contactLabel || "").match(/(0[1-9](?:[\s.-]?\d{2}){4}|\d{4})/);
      return {
        nom: p.nom,
        organisme: p.organisme || s.nom || "",
        montant: p.montant || p.cout || "À voir avec la structure",
        publics: p.publicsCibles || (p.ciblePublic ? [p.ciblePublic] : ["Tous publics"]),
        description: p.description ? (p.description.length > 140 ? p.description.slice(0, 140) + "…" : p.description) : "",
        contact: p.contactLabel || p.contact || "",
        tel: tel ? tel[0].replace(/[\s.-]/g, "") : null,
        lien: p.contactUrl || (s.email ? "mailto:" + s.email : ""),
        territoires: p.territoires || [],
      };
    });
    const greeting = cards.length === 1
      ? "Voici 1 aide qui correspond à votre question :"
      : `Voici ${cards.length} aides qui correspondent à votre question :`;
    const lignes = [greeting];
    scored.forEach((x, i) => {
      const p = x.p;
      const s = window.STRUCTURES.find(st => st.id === p.structureId) || {};
      const orga = p.organisme || s.nom || "";
      lignes.push("");
      lignes.push(`${i + 1}. ${p.nom}${orga ? " (" + orga + ")" : ""}`);
      lignes.push(`   Montant : ${p.montant || p.cout || "À voir"}.`);
      if (p.contactLabel || p.contact) lignes.push(`   Contact : ${p.contactLabel || p.contact}.`);
    });
    const sources = cards.map(c => ({ nom: c.nom + (c.organisme ? " — " + c.organisme : ""), lien: c.lien }));
    return { greeting, cards, answer_falc: lignes.join("\n"), sources };
  }

  const SUGGESTIONS = [
    "Comment ça marche, OrientaPro ?",
    "Comment réserver ma place pilote ?",
    "C'est un MVP de démonstration ?",
    "Je suis RQTH à Garges, quelles aides ?",
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

  const headerAvatar = el("div", { class: "op-chat-avatar", "aria-hidden": "true" }, ["L"]);
  const header = el("header", { class: "op-chat-header" }, [
    headerAvatar,
    el("div", { class: "op-chat-header-title", id: "op-chat-title" }, [
      "Léa, votre assistante OrientaPro",
      el("span", { class: "op-chat-header-sub" }, ["En ligne · Réponse en quelques secondes"]),
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
    el("strong", null, ["Bonjour 👋 Je suis Léa."]),
    document.createTextNode(" Posez-moi votre question, même imparfaite — je comprends. Je m'appuie sur des sources officielles (AGEFIPH, Bpifrance, ANCT, France Travail, Initiactive 95…) et je cite chaque réponse."),
    el("p", { class: "op-chat-intro-prompt" }, ["💡 Voici des exemples de questions :"]),
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
    setupAutoHideFab();
  }

  // === Auto-hide du FAB : approche footer, focus form, modale ouverte ======
  function setupAutoHideFab() {
    function hideFab() { fab.classList.add("is-hidden"); }
    function showFab() {
      // Ne ré-affiche pas si le panel est ouvert ou une modale est ouverte
      if (!panel.hidden) return;
      if (document.querySelector(".legal-modal.open")) return;
      fab.classList.remove("is-hidden");
    }
    // 1) Cache le FAB quand le footer entre dans le viewport
    const footer = document.querySelector("footer.footer");
    if (footer && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) hideFab();
        else showFab();
      }, { threshold: 0.05 });
      io.observe(footer);
    }
    // 2) Cache le FAB pendant la saisie dans un formulaire
    document.addEventListener("focusin", (e) => {
      if (e.target && e.target.matches && e.target.matches("input, textarea, select")) {
        hideFab();
      }
    });
    document.addEventListener("focusout", (e) => {
      // Si plus aucun input n'est focus, on ré-affiche après un court délai
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || !active.matches || !active.matches("input, textarea, select")) {
          showFab();
        }
      }, 100);
    });
    // 3) Cache le FAB quand une modale est ouverte
    const modalObserver = new MutationObserver(() => {
      const anyOpen = !!document.querySelector(".legal-modal.open");
      if (anyOpen) hideFab(); else showFab();
    });
    document.querySelectorAll(".legal-modal").forEach((m) => {
      modalObserver.observe(m, { attributes: true, attributeFilter: ["class"] });
    });
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

  // Rendu enrichi : greeting court + mini-cards par programme avec boutons d'action
  function appendBotCards(greeting, cards) {
    const wrap = el("div", { class: "op-msg op-msg-bot op-msg-rich" });
    if (greeting) wrap.appendChild(el("div", { class: "op-msg-text" }, [greeting]));
    const cardsWrap = el("div", { class: "op-chat-cards" });
    cards.forEach((c) => {
      const tags = (c.publics || []).slice(0, 2).map(p => el("span", { class: "op-chat-card-tag" }, [String(p).toUpperCase()]));
      const actions = el("div", { class: "op-chat-card-actions" });
      if (c.tel) {
        const btn = el("a", {
          class: "op-chat-card-btn op-chat-card-btn-primary",
          href: "tel:" + c.tel,
          "data-track": "chat_call_clicked",
          "aria-label": "Appeler " + c.organisme,
        }, ["📞 Appeler"]);
        actions.appendChild(btn);
      }
      if (c.lien) {
        const btn = el("a", {
          class: "op-chat-card-btn op-chat-card-btn-secondary",
          href: c.lien,
          target: "_blank",
          rel: "noopener",
          "data-track": "chat_link_clicked",
        }, ["→ Voir détails"]);
        actions.appendChild(btn);
      }
      const dossierBtn = el("button", {
        class: "op-chat-card-btn op-chat-card-btn-ghost",
        type: "button",
        "data-track": "chat_dossier_clicked",
        onclick: () => {
          close();
          if (window.OrientaProDossier && window.OrientaProDossier.open) {
            window.OrientaProDossier.open();
          } else {
            document.querySelector('[data-go="diagnostic"]')?.click();
          }
        },
      }, ["📋 Mon dossier"]);
      actions.appendChild(dossierBtn);

      const card = el("article", { class: "op-chat-card" }, [
        el("div", { class: "op-chat-card-tags" }, tags),
        el("h4", { class: "op-chat-card-nom" }, [c.nom]),
        c.organisme ? el("p", { class: "op-chat-card-orga" }, [c.organisme]) : null,
        el("div", { class: "op-chat-card-montant" }, [c.montant]),
        c.description ? el("p", { class: "op-chat-card-desc" }, [c.description]) : null,
        c.contact ? el("p", { class: "op-chat-card-contact" }, ["📞 " + c.contact]) : null,
        actions,
      ]);
      cardsWrap.appendChild(card);
    });
    wrap.appendChild(cardsWrap);
    const closing = el("p", { class: "op-chat-closing" }, [
      "💡 Pour aller plus loin, ",
      el("button", {
        class: "op-chat-closing-link",
        type: "button",
        onclick: () => { close(); document.querySelector('[data-go="diagnostic"]')?.click(); },
      }, ["faites le diagnostic gratuit complet"]),
      " — cela génère votre Dossier Passerelle à transmettre.",
    ]);
    wrap.appendChild(closing);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function appendBotBusy() {
    const dots = el("div", { class: "op-chat-typing", "aria-hidden": "true" }, [
      el("span", { class: "op-chat-typing-dot" }),
      el("span", { class: "op-chat-typing-dot" }),
      el("span", { class: "op-chat-typing-dot" }),
    ]);
    const srLabel = el("span", { class: "sr-only" }, ["Léa réfléchit à votre question"]);
    const wrap = el("div", { class: "op-msg op-msg-bot op-msg-busy", "aria-busy": "true" }, [dots, srLabel]);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    return wrap;
  }

  function appendError(message) {
    const node = el("div", { class: "op-msg op-msg-bot is-error" }, [
      "Désolé, je ne peux pas répondre pour l'instant : ",
      message || "service indisponible.",
      " Vous pouvez réessayer dans quelques secondes ou cliquer sur « Préparer mon dossier gratuit » pour découvrir le parcours en autonomie.",
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
    // Petit délai humain pour rendre l'expérience plus naturelle (~600 ms)
    await new Promise(r => setTimeout(r, 500));
    busyNode.remove();
    if (res) {
      // Rendu enrichi (mini-cards) si la réponse en contient
      if (Array.isArray(res.cards) && res.cards.length) {
        appendBotCards(res.greeting || "Voici ce que je trouve :", res.cards);
      } else {
        appendBot(res.answer_falc || "Je n'ai pas trouvé d'information précise.", res.sources || []);
      }
      if (window.trackEvent) window.trackEvent("chat_question_asked", { cards: (res.cards || []).length });
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
