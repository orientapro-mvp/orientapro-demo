// assets/programmes-extended.js
// Catalogue étendu de structures et programmes d'accompagnement.
// Fusionne avec les STRUCTURES et PROGRAMMES déjà déclarés en haut de index.html.
//
// Schéma riche (conforme au brief OrientaPro v2) :
// id, nomStructure, nomProgramme, description, publicsCibles[], profilsPrioritaires[],
// stadesAcceptes[], besoinsCouverts[], territoires[], format, duree, cout,
// conditionsAcces[], documentsAttendus[], accessibilite, contactLabel, contactUrl, tags[]

(function () {
  // Nouvelles structures (id 5 à 11) — complètent les 4 existantes (BGE, ADIE, h'up, France Active)
  const NEW_STRUCTURES = [
    { id: 5, nom: "Réseau Entreprendre IDF", email: "demo-re-idf@orientapro.fr", region: "Île-de-France", ville: "Paris" },
    { id: 6, nom: "URSCOP Île-de-France (CAE)", email: "demo-urscop@orientapro.fr", region: "Île-de-France", ville: "Paris" },
    { id: 7, nom: "Initiactive 95", email: "demo-initiactive@orientapro.fr", region: "Île-de-France", ville: "Cergy" },
    { id: 8, nom: "La Ruche", email: "demo-laruche@orientapro.fr", region: "Île-de-France", ville: "Paris" },
    { id: 9, nom: "France Travail Val-d'Oise", email: "demo-ft95@orientapro.fr", region: "Île-de-France", ville: "Cergy" },
    { id: 10, nom: "CCI Val-d'Oise", email: "demo-cci95@orientapro.fr", region: "Île-de-France", ville: "Cergy-Pontoise" },
    { id: 11, nom: "Roissy Développement", email: "demo-roissydev@orientapro.fr", region: "Île-de-France", ville: "Roissy-en-France" },
  ];

  // Catalogue étendu — chaque entrée respecte le schéma v2 (avec rétro-compatibilité ciblePublic/zoneGeographique).
  const NEW_PROGRAMMES = [
    {
      id: 10,
      structureId: 5,
      nom: "Réseau Entreprendre — Lauréat",
      description: "Accompagnement par un chef d'entreprise expérimenté pendant 2 à 3 ans + prêt d'honneur 15 000 à 50 000 €. Sélection sur dossier. Pour porteurs ambitieux avec création d'emplois prévue.",
      ciblePublic: "Tous",
      zoneGeographique: "Île-de-France",
      capaciteAnnuelle: 60,
      prisEnCharge: true,
      duree: "2 à 3 ans",
      format: "Présentiel + mentorat",
      contact: "contact-idf@reseau-entreprendre.org",
      // Schéma v2
      publicsCibles: ["tous"],
      profilsPrioritaires: ["projet ambitieux", "création d'emplois"],
      stadesAcceptes: ["projet à structurer", "création en cours"],
      besoinsCouverts: ["business plan", "financement", "réseau"],
      territoires: ["Île-de-France"],
      cout: "Gratuit",
      conditionsAcces: ["Projet créant ≥ 2 emplois sous 3 ans", "Validation en comité"],
      documentsAttendus: ["Business plan", "Prévisionnel financier 3 ans", "CV porteur"],
      accessibilite: "Locaux accessibles, accompagnement adaptable RQTH",
      contactLabel: "Réseau Entreprendre IDF",
      contactUrl: "https://www.reseau-entreprendre.org/",
      tags: ["mentorat", "prêt-d-honneur", "ambitieux"],
    },
    {
      id: 11,
      structureId: 6,
      nom: "CAE — Coopérative d'Activité et d'Emploi",
      description: "Tester votre activité en tant qu'entrepreneur-salarié pendant 6 à 36 mois. Statut sécurisé (contrat de travail), comptabilité gérée par la coopérative, accompagnement collectif. Idéal pour tester sans créer juridiquement.",
      ciblePublic: "Tous",
      zoneGeographique: "Île-de-France",
      capaciteAnnuelle: 200,
      prisEnCharge: true,
      duree: "6 à 36 mois",
      format: "Hybride",
      contact: "contact@cooperer.coop",
      publicsCibles: ["tous"],
      profilsPrioritaires: ["demandeur emploi", "tester avant créer"],
      stadesAcceptes: ["test", "projet à structurer"],
      besoinsCouverts: ["test d'activité", "statut juridique", "réseau"],
      territoires: ["Île-de-France"],
      cout: "Gratuit (commission sur CA généré)",
      conditionsAcces: ["Idée d'activité prête à être testée", "Premier rendez-vous d'information"],
      documentsAttendus: ["Présentation du projet", "Estimation du chiffre d'affaires potentiel"],
      accessibilite: "Locaux PMR, FALC sur demande",
      contactLabel: "URSCOP Île-de-France (annuaire CAE)",
      contactUrl: "https://www.les-scop.coop/cooperative-activite-emploi",
      tags: ["test-activité", "couveuse", "ESS", "salariat"],
    },
    {
      id: 12,
      structureId: 7,
      nom: "Initiactive 95 — Prêt d'honneur Val-d'Oise",
      description: "Plateforme Initiative France du Val-d'Oise. Prêt d'honneur de 3 000 à 30 000 € à taux zéro, sans garantie. Accompagnement par des bénévoles entrepreneurs avant et après le prêt. Signataire de la charte CARPF (Engagement Quartiers 2030).",
      ciblePublic: "Tous",
      zoneGeographique: "Île-de-France",
      capaciteAnnuelle: 150,
      prisEnCharge: true,
      duree: "Variable",
      format: "Hybride",
      contact: "01 39 88 11 99",
      publicsCibles: ["tous", "QPV", "RQTH"],
      profilsPrioritaires: ["QPV", "Val-d'Oise"],
      stadesAcceptes: ["création en cours", "entreprise créée"],
      besoinsCouverts: ["financement", "réseau"],
      territoires: ["Val-d'Oise", "Île-de-France"],
      cout: "Gratuit",
      conditionsAcces: ["Résider ou créer en Val-d'Oise", "Projet viable validé en comité"],
      documentsAttendus: ["Business plan", "Prévisionnel", "Kbis ou projet de statuts"],
      accessibilite: "Accessibilité variable selon antenne — appeler avant",
      contactLabel: "Initiactive 95",
      contactUrl: "https://www.initiactive95.com/",
      tags: ["prêt-d-honneur", "Val-d'Oise", "CARPF", "QPV"],
    },
    {
      id: 13,
      structureId: 8,
      nom: "La Ruche — Bootcamp Entrepreneur",
      description: "Programme intensif de 8 semaines pour structurer son projet : business model, marketing digital, financement, pitch. Bourses pour publics QPV et RQTH (gratuit pour eux). Communauté nationale de 6 000 entrepreneurs.",
      ciblePublic: "Tous",
      zoneGeographique: "Île-de-France",
      capaciteAnnuelle: 120,
      prisEnCharge: true,
      duree: "8 semaines",
      format: "Présentiel + en ligne",
      contact: "Via formulaire en ligne",
      publicsCibles: ["tous", "QPV", "RQTH", "femmes"],
      profilsPrioritaires: ["impact social", "QPV", "femmes"],
      stadesAcceptes: ["projet à structurer", "test"],
      besoinsCouverts: ["business plan", "communication", "réseau", "financement"],
      territoires: ["Île-de-France", "national"],
      cout: "Bourse possible (gratuit pour publics éligibles)",
      conditionsAcces: ["Projet ou idée existante", "Engagement 8 semaines"],
      documentsAttendus: ["Présentation du projet", "Disponibilité confirmée"],
      accessibilite: "Locaux PMR, support FALC sur demande",
      contactLabel: "La Ruche",
      contactUrl: "https://la-ruche.net/",
      tags: ["bootcamp", "incubateur-social", "impact", "8-semaines"],
    },
    {
      id: 14,
      structureId: 9,
      nom: "France Travail — Activ'Créa",
      description: "Atelier collectif de 4 demi-journées pour structurer son projet de création d'entreprise quand on est demandeur d'emploi. Gratuit, animé par un conseiller spécialisé. Étape souvent demandée avant l'ARCE.",
      ciblePublic: "Demandeurs emploi",
      zoneGeographique: "national",
      capaciteAnnuelle: 1000,
      prisEnCharge: true,
      duree: "4 demi-journées",
      format: "Présentiel",
      contact: "3949",
      publicsCibles: ["demandeur emploi"],
      profilsPrioritaires: ["demandeur emploi indemnisé", "reconversion"],
      stadesAcceptes: ["idée", "projet à structurer"],
      besoinsCouverts: ["business plan", "test d'activité", "financement"],
      territoires: ["national"],
      cout: "Gratuit",
      conditionsAcces: ["Inscription à France Travail", "Projet de création identifié"],
      documentsAttendus: ["Identifiant France Travail", "Description du projet en 5 lignes"],
      accessibilite: "Réseau France Travail accessible PMR ; demander un référent handicap",
      contactLabel: "France Travail (3949)",
      contactUrl: "https://www.francetravail.fr/candidat/en-formation/creer-mon-entreprise/activcrea.html",
      tags: ["France-Travail", "demandeur-emploi", "ARCE", "atelier"],
    },
    {
      id: 15,
      structureId: 10,
      nom: "CCI Val-d'Oise — 5 jours pour entreprendre",
      description: "Formation collective de 5 jours pour acquérir les bases de la création d'entreprise : marché, juridique, finance, communication. Coût modique, places limitées. Accompagnement individuel disponible en sortie.",
      ciblePublic: "Tous",
      zoneGeographique: "Île-de-France",
      capaciteAnnuelle: 200,
      prisEnCharge: false,
      duree: "5 jours",
      format: "Présentiel",
      contact: "01 30 75 35 35",
      publicsCibles: ["tous"],
      profilsPrioritaires: ["projet structuré", "premier-pas"],
      stadesAcceptes: ["idée", "projet à structurer", "création en cours"],
      besoinsCouverts: ["business plan", "statut juridique", "financement", "communication"],
      territoires: ["Val-d'Oise", "Île-de-France"],
      cout: "~280 € (financement OPCO possible)",
      conditionsAcces: ["Projet réel de création", "Disponibilité 5 jours consécutifs"],
      documentsAttendus: ["Fiche d'inscription CCI", "Justificatif statut (RSA, demandeur emploi…)"],
      accessibilite: "Locaux CCI PMR, FALC partiel",
      contactLabel: "CCI Val-d'Oise",
      contactUrl: "https://www.cci-paris-idf.fr/fr/cci-val-doise",
      tags: ["CCI", "formation", "Val-d'Oise", "5-jours"],
    },
  ];

  // Fusion avec les structures et programmes existants déclarés dans index.html (en haut du <script>).
  function mergeCatalog() {
    if (typeof STRUCTURES === "undefined" || typeof PROGRAMMES === "undefined") {
      console.warn("[programmes-extended] STRUCTURES/PROGRAMMES introuvables — assure-toi que ce script charge APRÈS le <script> principal d'index.html.");
      return;
    }
    NEW_STRUCTURES.forEach((s) => {
      if (!STRUCTURES.find((x) => x.id === s.id)) STRUCTURES.push(s);
    });
    NEW_PROGRAMMES.forEach((p) => {
      if (!PROGRAMMES.find((x) => x.id === p.id)) PROGRAMMES.push(p);
    });
    // Recalcule les diagnostics seed pour qu'ils prennent en compte les nouveaux programmes.
    if (typeof DIAGNOSTICS !== "undefined" && typeof match === "function") {
      DIAGNOSTICS.forEach((d) => { d.programmesMatched = match(d); });
    }
    if (window.ORIENTAPRO_DEBUG) {
      console.log("[programmes-extended] catalogue étendu :", STRUCTURES.length, "structures,", PROGRAMMES.length, "programmes");
    }
  }

  // Exécute la fusion une fois que tout le DOM (et donc le <script> principal) est chargé.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mergeCatalog);
  } else {
    mergeCatalog();
  }

  window.OrientaProCatalog = { NEW_STRUCTURES, NEW_PROGRAMMES, mergeCatalog };
})();
