// assets/scoring-v2.js — Scoring V2 OrientaPro (brief utilisateur, J-1)
//
// 6 axes pondérés sur 100 :
//   - Profil porteur (RQTH/QPV/femme/jeune)  : 25 pts
//   - Stade du projet (idée → entreprise)   : 20 pts
//   - Besoins détectés                       : 20 pts
//   - Territoire (Val-d'Oise / IDF / national) : 15 pts
//   - Type d'accompagnement souhaité         : 10 pts
//   - Accessibilité et contraintes           : 10 pts
//
// Le module reste compatible avec la fonction `match()` existante dans index.html
// en exposant `scorerV2()` et `matchV2()` sur window. Bascule via le flag
// `USE_SCORER_V2` (true par défaut). Pour rollback en démo : passer à false.

(function () {
  const FLAG_KEY = "USE_SCORER_V2";
  window[FLAG_KEY] = window[FLAG_KEY] !== false; // true par défaut

  // ----- Helpers --------------------------------------------------

  function norm(s) {
    if (!s) return "";
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  function publicsOf(p) {
    // Compat anciens et nouveaux schémas
    if (Array.isArray(p.publicsCibles)) return p.publicsCibles.map(norm);
    if (p.ciblePublic) return [norm(p.ciblePublic)];
    return [];
  }

  function territoiresOf(p) {
    if (Array.isArray(p.territoires)) return p.territoires.map(norm);
    if (p.zoneGeographique) return [norm(p.zoneGeographique)];
    return [];
  }

  function stadesOf(p) {
    if (Array.isArray(p.stadesAcceptes)) return p.stadesAcceptes.map(norm);
    return []; // si non précisé, on tolère tous les stades (handle ailleurs)
  }

  function besoinsOf(p) {
    if (Array.isArray(p.besoinsCouverts)) return p.besoinsCouverts.map(norm);
    // Fallback : tente d'inférer depuis la description
    const desc = norm(p.description || "") + " " + norm(p.nom || "");
    const inferred = [];
    if (/financ|micro.?credit|pret|garantie|subvention/.test(desc)) inferred.push("financement");
    if (/formation|atelier|parcours|mentor|coaching/.test(desc)) inferred.push("business plan", "formation");
    if (/reseau|club|communaute/.test(desc)) inferred.push("réseau");
    if (/incubateur|pepiniere|coworking/.test(desc)) inferred.push("local", "hébergement");
    if (/test|couveuse|coopera/.test(desc)) inferred.push("test d'activité");
    return inferred;
  }

  // Normalisation des valeurs du profil utilisateur (issues du formulaire OrientaPro)
  function normalizeProfile(profile) {
    return {
      rqth: !!profile.rqth,
      qpv: !!profile.qpv,
      femme: norm(profile.genre) === "femme" || norm(profile.profil || "").includes("femme"),
      jeune: ["18-25", "26-35"].includes(profile.trancheAge),
      statut: norm(profile.statutActuel),
      region: norm(profile.region),
      ville: norm(profile.ville || ""),
      // Stade : mappe les valeurs du questionnaire vers les stades du catalogue
      stade: mapStade(profile.maturiteProjet || profile.stadeProjet || ""),
      besoin: norm(profile.besoinPrincipal || profile.besoin || ""),
      typeAccompagnement: norm(profile.typeAccompagnement || profile.format || ""),
      contraintesA11y: norm(profile.contraintesAccessibilite || ""),
    };
  }

  function mapStade(s) {
    const n = norm(s);
    if (!n) return "";
    if (n.includes("idee") || n.startsWith("idea")) return "idée";
    if (n.includes("structur") || n.includes("etude")) return "projet à structurer";
    if (n.includes("test")) return "test";
    if (n.includes("creation") || n.includes("lance") || n.includes("immatricul")) return "création en cours";
    if (n.includes("creee") || n.includes("deja lance") || n.includes("entreprise")) return "entreprise créée";
    return n;
  }

  // ----- Scoring 6 axes ------------------------------------------

  function scorerV2(profile, programme) {
    const u = normalizeProfile(profile);
    const publics = publicsOf(programme);
    const territoires = territoiresOf(programme);
    const stades = stadesOf(programme);
    const besoins = besoinsOf(programme);

    let score = 0;
    const raisons = [];

    // -- Axe 1 : Profil porteur (25 pts) --
    let scoreProfil = 0;
    if (u.rqth && publics.some(p => p === "rqth")) {
      scoreProfil += 25;
      raisons.push("Programme dédié aux travailleurs en situation de handicap (RQTH)");
    } else if (u.qpv && publics.some(p => p === "qpv")) {
      scoreProfil += 22;
      raisons.push("Programme dédié aux résidents de quartiers prioritaires (QPV)");
    } else if (u.femme && publics.some(p => p === "femmes")) {
      scoreProfil += 20;
      raisons.push("Programme dédié aux créatrices d'entreprise");
    } else if (u.jeune && publics.some(p => p === "jeunes")) {
      scoreProfil += 18;
      raisons.push("Programme dédié aux jeunes porteurs (moins de 32 ans)");
    } else if (u.statut === "demandeur emploi" && publics.some(p => p.includes("demandeur"))) {
      scoreProfil += 18;
      raisons.push("Programme adapté aux demandeurs d'emploi");
    } else if (publics.some(p => p === "tous")) {
      scoreProfil += 10;
    }
    score += scoreProfil;

    // -- Axe 2 : Stade du projet (20 pts) --
    let scoreStade = 0;
    if (u.stade && stades.includes(u.stade)) {
      scoreStade += 20;
      raisons.push(`Programme aligné avec votre stade « ${u.stade} »`);
    } else if (stades.length === 0) {
      // Le programme n'a pas précisé ses stades → tolérance
      scoreStade += 10;
    } else if (u.stade) {
      // Vérifie une proximité (idée ≈ projet à structurer, test ≈ création en cours)
      const adjacent = {
        "idée": ["projet à structurer"],
        "projet à structurer": ["idée", "test"],
        "test": ["projet à structurer", "création en cours"],
        "création en cours": ["test", "entreprise créée"],
        "entreprise créée": ["création en cours"],
      };
      if ((adjacent[u.stade] || []).some(s => stades.includes(s))) {
        scoreStade += 12;
        raisons.push("Programme compatible avec une transition de stade");
      }
    }
    score += scoreStade;

    // -- Axe 3 : Besoins détectés (20 pts) --
    let scoreBesoins = 0;
    const besoinKey = mapBesoin(u.besoin);
    if (besoinKey && besoins.some(b => norm(b).includes(besoinKey))) {
      scoreBesoins += 20;
      raisons.push(`Couvre votre besoin principal : ${u.besoin}`);
    } else if (besoinKey === "ne sais pas" || besoins.length === 0) {
      scoreBesoins += 8;
    } else if (besoinKey && besoins.length > 0) {
      // Petit boost si au moins un besoin proche est couvert
      const synonymes = besoinSynonymes(besoinKey);
      if (besoins.some(b => synonymes.some(s => norm(b).includes(s)))) {
        scoreBesoins += 12;
        raisons.push("Couvre un besoin proche de ce que vous avez exprimé");
      }
    }
    score += scoreBesoins;

    // -- Axe 4 : Territoire (15 pts) --
    let scoreTerritoire = 0;
    if (territoires.some(t => t === "national")) {
      scoreTerritoire += 12;
      raisons.push("Programme accessible partout en France");
    }
    if (u.region && territoires.some(t => t === u.region)) {
      scoreTerritoire = Math.max(scoreTerritoire, 15);
      raisons.push(`Programme implanté en ${profile.region}`);
    }
    // Bonus Val-d'Oise spécifique (territoire pilote CARPF)
    if (territoires.some(t => t.includes("val-d-oise") || t.includes("val d'oise"))) {
      if (u.region.includes("ile-de-france") || (u.ville && u.ville.length > 0)) {
        scoreTerritoire = Math.max(scoreTerritoire, 15);
      }
    }
    score += scoreTerritoire;

    // -- Axe 5 : Type d'accompagnement souhaité (10 pts) --
    let scoreAccompagnement = 0;
    if (u.typeAccompagnement) {
      const f = norm(programme.format || "");
      const map = {
        "individuel": ["individuel", "mentorat", "coaching"],
        "collectif": ["collectif", "atelier", "bootcamp", "formation"],
        "incubation": ["incubateur", "incubation", "hebergement"],
        "financement": ["financement", "pret", "garantie", "microcredit"],
        "test d'activité": ["test", "couveuse", "coopera"],
      };
      const expected = map[u.typeAccompagnement] || [];
      if (expected.some(e => f.includes(e) || norm(programme.description || "").includes(e))) {
        scoreAccompagnement += 10;
        raisons.push(`Format d'accompagnement souhaité (${u.typeAccompagnement}) disponible`);
      } else if (u.typeAccompagnement === "ne sais pas") {
        scoreAccompagnement += 5;
      }
    } else {
      scoreAccompagnement += 5;
    }
    score += scoreAccompagnement;

    // -- Axe 6 : Accessibilité et contraintes (10 pts) --
    let scoreA11y = 0;
    const a11y = norm(programme.accessibilite || "");
    if (u.rqth) {
      if (a11y.includes("pmr") || a11y.includes("falc") || a11y.includes("rqth") || a11y.includes("adapt")) {
        scoreA11y += 10;
        raisons.push("Locaux et accompagnement adaptés aux besoins d'accessibilité");
      } else if (a11y) {
        scoreA11y += 5;
      }
    } else {
      // Pas de besoin a11y exprimé : on ne pénalise pas
      scoreA11y += 7;
    }
    score += scoreA11y;

    return {
      score: Math.min(Math.round(score), 100),
      raisons: raisons.slice(0, 5),
      details: { scoreProfil, scoreStade, scoreBesoins, scoreTerritoire, scoreAccompagnement, scoreA11y },
    };
  }

  function mapBesoin(s) {
    const n = norm(s);
    if (!n) return "";
    if (n.includes("financ")) return "financement";
    if (n.includes("business") || n.includes("plan")) return "business plan";
    if (n.includes("juridique") || n.includes("statut")) return "statut juridique";
    if (n.includes("test")) return "test d'activité";
    if (n.includes("accessib")) return "accessibilité";
    if (n.includes("communic")) return "communication";
    if (n.includes("local") || n.includes("hebergement")) return "local";
    if (n.includes("reseau") || n.includes("mise en")) return "réseau";
    if (n.includes("ne sais") || n.includes("nsp")) return "ne sais pas";
    return n;
  }

  function besoinSynonymes(key) {
    return ({
      "financement": ["microcredit", "pret", "garantie", "subvention", "capital", "argent"],
      "business plan": ["plan", "etude", "marche", "previsionnel", "structur"],
      "statut juridique": ["juridique", "kbis", "siret", "statut", "auto-entrepreneur"],
      "test d'activité": ["test", "couveuse", "coopera", "essai"],
      "communication": ["marketing", "site", "web", "reseaux sociaux", "branding"],
      "local": ["hebergement", "coworking", "pepiniere", "incubateur"],
      "réseau": ["mentor", "club", "communaute", "networking"],
      "accessibilité": ["adaptation", "falc", "ergonom", "handicap"],
    })[key] || [];
  }

  // ----- Match V2 -----------------------------------------------

  function matchV2(profile) {
    if (typeof PROGRAMMES === "undefined") return [];
    const all = PROGRAMMES
      .filter(p => p.prisEnCharge !== false)
      .map(p => {
        const { score, raisons } = scorerV2(profile, p);
        return { id: p.id, score, raisons };
      });
    // Garder les scores >= 30 (sinon on garde les meilleurs même bas pour ne jamais rendre une liste vide)
    const above = all.filter(x => x.score >= 30).sort((a, b) => b.score - a.score);
    const sorted = above.length >= 3 ? above : all.sort((a, b) => b.score - a.score);
    return sorted.slice(0, 5);
  }

  window.scorerV2 = scorerV2;
  window.matchV2 = matchV2;

  // Bascule transparente : on remplace `match()` si flag actif et si match() existe.
  if (window[FLAG_KEY] && typeof window.match === "function") {
    window._originalMatch = window.match;
    window.match = function (profile) {
      try {
        return matchV2(profile);
      } catch (err) {
        console.warn("[scoring-v2] fallback sur scorer historique :", err);
        return window._originalMatch(profile);
      }
    };
    if (window.ORIENTAPRO_DEBUG) console.log("[scoring-v2] match() remplacé par matchV2()");
  }
})();
