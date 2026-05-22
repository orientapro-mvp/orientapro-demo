"""
OrientaPro — MVP Streamlit
==========================
Application d'aide à la création d'entreprise pour publics fragiles
(handicap, barrière linguistique, QPV).

Architecture :
  1. Saisie vocale  -> Whisper API (transcription audio -> texte)
  2. Analyse IA     -> GPT (extraction structurée en JSON strict)
  3. Export PDF     -> ReportLab (dossier prêt pour conseiller BGE/CCI/CMA)

Principes :
  - UI inspirée du FALC (Facile A Lire et a Comprendre) :
    boutons larges, pictogrammes, contrastes élevés, langage simple.
  - RGPD-compliant : aucune donnée persistée. Tout reste en memoire
    (st.session_state) et disparait a la fermeture de l'onglet.
  - Code modulaire (transcription / analyse / PDF sont independants).

Lancement local :
    pip install -r requirements.txt
    export OPENAI_API_KEY="sk-..."
    streamlit run app.py
"""

from __future__ import annotations

import io
import json
import os
from datetime import datetime
from typing import Any

import streamlit as st
from openai import OpenAI, OpenAIError
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

# Modèles OpenAI utilisés.
# - whisper-1   : transcription audio (multi-langue, robuste accents).
# - gpt-4o-mini : extraction structurée (rapide + JSON mode natif + low cost).
WHISPER_MODEL = "whisper-1"
LLM_MODEL = "gpt-4o-mini"

# Schéma des 5 champs critiques attendus, aligné avec les nomenclatures
# Bpifrance / BGE pour faciliter l'interopérabilité downstream.
CHAMPS_CRITIQUES = [
    "statut_social",            # ex : RQTH, demandeur d'emploi, QPV, micro-entrepreneur...
    "secteur",                  # ex : restauration, BTP, services a la personne...
    "besoin_total_eur",         # montant global du projet en euros (entier)
    "apport_personnel_eur",     # montant de l'apport personnel en euros (entier)
    "besoins_accompagnement",   # liste : business plan, juridique, financement, formation...
]


def get_openai_client() -> OpenAI:
    """
    Initialise le client OpenAI a partir de la cle API.

    Ordre de recherche de la cle :
      1. st.secrets["OPENAI_API_KEY"] (recommande sur Streamlit Cloud)
      2. variable d'environnement OPENAI_API_KEY (local / Docker)

    Levee d'erreur explicite si aucune cle n'est trouvee, pour eviter
    un crash silencieux au premier appel API.
    """
    api_key = None
    try:
        api_key = st.secrets["OPENAI_API_KEY"]
    except (KeyError, FileNotFoundError):
        api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "Cle API OpenAI manquante. Definissez OPENAI_API_KEY "
            "dans les variables d'environnement ou dans .streamlit/secrets.toml."
        )
    return OpenAI(api_key=api_key)


# =============================================================================
# MODULE 1 — TRANSCRIPTION VOCALE (Whisper)
# =============================================================================

def transcrire_audio(audio_bytes: bytes, langue: str = "fr") -> str:
    """
    Transcrit un fichier audio en texte via l'API Whisper.

    Args:
        audio_bytes: contenu binaire du fichier audio (wav/mp3/m4a/webm).
        langue: code ISO de la langue parlee (ex: "fr", "ar", "en").
                Whisper auto-detecte si None, mais forcer la langue
                ameliore la precision pour les locuteurs non-natifs.

    Returns:
        Le texte transcrit (chaine vide si l'audio est silencieux).

    Raises:
        RuntimeError: erreur reseau / API / quota OpenAI.
    """
    # Whisper attend un objet "file-like" avec un nom (pour deviner le format).
    # On enveloppe les bytes dans un BytesIO nomme.
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "input.wav"  # Streamlit st.audio_input retourne du wav.

    try:
        client = get_openai_client()
        transcription = client.audio.transcriptions.create(
            model=WHISPER_MODEL,
            file=audio_file,
            language=langue,
            # response_format="text" -> on recupere directement la string,
            # sans avoir a parser un objet JSON.
            response_format="text",
        )
        # L'API retourne soit un str (response_format=text), soit un objet.
        return transcription.strip() if isinstance(transcription, str) else transcription.text.strip()

    except OpenAIError as exc:
        # On remonte une exception "metier" propre, le call-site affichera
        # un message FALC-friendly a l'utilisateur.
        raise RuntimeError(f"Erreur de transcription : {exc}") from exc


# =============================================================================
# MODULE 2 — ANALYSE IA (Extraction structuree)
# =============================================================================

# Prompt systeme : on impose un JSON strict et on donne des regles
# explicites pour chaque champ. Le mode JSON d'OpenAI garantit que la
# reponse est parseable, mais le contenu depend de la qualite du prompt.
SYSTEM_PROMPT = """Tu es un assistant specialise dans l'accompagnement
a la creation d'entreprise pour des publics fragiles en France
(personnes en situation de handicap, allophones, residents de QPV).

Tu analyses le recit d'un porteur de projet et tu extrais EXACTEMENT
les 5 champs suivants au format JSON strict :

{
  "statut_social": "string - statut administratif (ex: RQTH, demandeur d'emploi,
                   beneficiaire RSA, resident QPV, micro-entrepreneur, salarie...).
                   Mets 'non precise' si l'information n'est pas donnee.",
  "secteur": "string - secteur d'activite envisage (ex: restauration, BTP,
              services a la personne, e-commerce, artisanat...). 'non precise' sinon.",
  "besoin_total_eur": "integer - montant total du projet en euros (entier, sans symbole).
                       0 si non precise. Convertis les ordres de grandeur (ex: '15 mille' = 15000).",
  "apport_personnel_eur": "integer - apport personnel en euros (entier, sans symbole).
                           0 si non precise.",
  "besoins_accompagnement": "array of strings - liste des besoins d'accompagnement
                             identifies parmi : 'business plan', 'etude de marche',
                             'juridique', 'financement', 'formation', 'comptabilite',
                             'commercial', 'numerique', 'mentorat'. Liste vide si rien."
}

Regles imperatives :
- Reponds UNIQUEMENT avec le JSON, sans texte autour, sans markdown.
- Tous les champs sont obligatoires (utilise les valeurs par defaut au besoin).
- Les montants sont des ENTIERS (pas de string, pas de decimales, pas de '€').
- N'invente pas d'information : si le porteur ne dit rien sur un champ,
  utilise la valeur par defaut prevue.
"""


def analyser_texte(texte: str) -> dict[str, Any]:
    """
    Envoie le recit du porteur a un LLM et recupere les 5 champs structures.

    Args:
        texte: recit libre du porteur de projet (sortie de Whisper ou saisi a la main).

    Returns:
        Dict respectant le schema CHAMPS_CRITIQUES.

    Raises:
        RuntimeError: erreur API ou reponse non-parseable.
    """
    if not texte or not texte.strip():
        raise RuntimeError("Le texte a analyser est vide.")

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=LLM_MODEL,
            # JSON mode : OpenAI garantit que le contenu est un JSON valide.
            response_format={"type": "json_object"},
            # temperature basse -> reponses plus deterministes et fiables
            # pour de l'extraction structuree (vs creative writing).
            temperature=0.1,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": texte},
            ],
        )
        contenu = response.choices[0].message.content
        donnees = json.loads(contenu)

    except OpenAIError as exc:
        raise RuntimeError(f"Erreur de l'IA d'analyse : {exc}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"L'IA n'a pas renvoye un JSON valide : {exc}") from exc

    # Garde-fou : on s'assure que tous les champs attendus sont presents,
    # meme si le LLM en a oublie un. On normalise aussi les types.
    return _normaliser_donnees(donnees)


def _normaliser_donnees(donnees: dict[str, Any]) -> dict[str, Any]:
    """
    Force le schema attendu : remplit les champs manquants et cast les types.

    Cette fonction est defensive : meme avec JSON mode, le LLM peut renvoyer
    un montant en string ("15000 euros") ou oublier un champ. On nettoie
    pour garantir que le PDF en aval ne crashera pas.
    """
    defauts = {
        "statut_social": "non precise",
        "secteur": "non precise",
        "besoin_total_eur": 0,
        "apport_personnel_eur": 0,
        "besoins_accompagnement": [],
    }
    resultat: dict[str, Any] = {}

    for cle, valeur_defaut in defauts.items():
        valeur = donnees.get(cle, valeur_defaut)

        # Cast montants -> int (tolerant aux strings "15000" ou "15 000 €")
        if cle.endswith("_eur"):
            if isinstance(valeur, str):
                # Garde uniquement les chiffres
                chiffres = "".join(c for c in valeur if c.isdigit())
                valeur = int(chiffres) if chiffres else 0
            elif isinstance(valeur, float):
                valeur = int(valeur)
            elif not isinstance(valeur, int):
                valeur = 0

        # Cast accompagnement -> list[str]
        if cle == "besoins_accompagnement":
            if isinstance(valeur, str):
                valeur = [valeur] if valeur else []
            elif not isinstance(valeur, list):
                valeur = []

        resultat[cle] = valeur

    return resultat


# =============================================================================
# MODULE 3 — EXPORT PDF
# =============================================================================

def generer_pdf(donnees: dict[str, Any], texte_brut: str) -> bytes:
    """
    Genere un PDF A4 contenant le dossier structure du porteur de projet.

    Le PDF est concu pour etre transmis a un conseiller BGE / CCI / CMA :
      - En-tete avec date et identifiant de session.
      - Tableau recapitulatif des 5 champs critiques.
      - Verbatim du porteur (texte brut transcrit).
      - Pied de page mentionnant le traitement RGPD.

    Args:
        donnees: dict valide selon le schema CHAMPS_CRITIQUES.
        texte_brut: recit complet du porteur (verbatim transcrit).

    Returns:
        Le PDF sous forme de bytes, pret a etre passe a st.download_button.
    """
    buffer = io.BytesIO()
    # SimpleDocTemplate gere automatiquement les sauts de page.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="OrientaPro - Dossier porteur",
    )

    # On part de la stylesheet par defaut et on ajoute nos styles custom.
    styles = getSampleStyleSheet()
    style_titre = ParagraphStyle(
        "TitreOP",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=colors.HexColor("#003399"),  # bleu Republique Francaise
        spaceAfter=12,
    )
    style_sstitre = ParagraphStyle(
        "SsTitre",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#333333"),
        spaceAfter=8,
    )
    style_corps = ParagraphStyle(
        "Corps",
        parent=styles["BodyText"],
        fontSize=11,
        leading=15,
    )
    style_footer = ParagraphStyle(
        "Footer",
        parent=styles["BodyText"],
        fontSize=8,
        textColor=colors.grey,
        alignment=1,  # centre
    )

    story: list[Any] = []

    # --- En-tete ---
    story.append(Paragraph("OrientaPro", style_titre))
    story.append(Paragraph(
        "Dossier de creation d'entreprise - publics accompagnes",
        style_sstitre,
    ))
    story.append(Paragraph(
        f"Date : {datetime.now().strftime('%d/%m/%Y a %H:%M')}",
        style_corps,
    ))
    story.append(Spacer(1, 0.6 * cm))

    # --- Tableau des 5 champs critiques ---
    story.append(Paragraph("Synthese du projet", style_sstitre))

    lignes_tableau = [
        ["Champ", "Valeur"],
        ["Statut social", str(donnees["statut_social"])],
        ["Secteur d'activite", str(donnees["secteur"])],
        ["Besoin total", f"{donnees['besoin_total_eur']:,} EUR".replace(",", " ")],
        ["Apport personnel", f"{donnees['apport_personnel_eur']:,} EUR".replace(",", " ")],
        [
            "Besoins d'accompagnement",
            ", ".join(donnees["besoins_accompagnement"]) or "Aucun precise",
        ],
    ]
    tableau = Table(lignes_tableau, colWidths=[6 * cm, 10 * cm])
    tableau.setStyle(TableStyle([
        # En-tete
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003399")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        # Corps
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F5F5F5")),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tableau)
    story.append(Spacer(1, 0.8 * cm))

    # --- Verbatim ---
    story.append(Paragraph("Recit du porteur (verbatim)", style_sstitre))
    # On echappe les caracteres speciaux HTML pour eviter que ReportLab
    # interprete des < ou > dans le verbatim comme du markup.
    verbatim_propre = (
        texte_brut.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )
    story.append(Paragraph(verbatim_propre or "<i>(aucun texte fourni)</i>", style_corps))
    story.append(Spacer(1, 1 * cm))

    # --- Footer RGPD ---
    story.append(Paragraph(
        "Document genere par OrientaPro - Aucune donnee n'est conservee apres "
        "fermeture de la session. Traitement RGPD-compliant.",
        style_footer,
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# =============================================================================
# UI STREAMLIT — Design FALC
# =============================================================================

# Configuration globale de la page : titre d'onglet, layout large, icone.
st.set_page_config(
    page_title="OrientaPro - Mon projet d'entreprise",
    page_icon="🚀",
    layout="centered",  # centered = colonne unique, plus lisible en FALC
    initial_sidebar_state="collapsed",
)

# CSS custom pour respecter les principes FALC :
#   - polices grandes (>=18px corps, >=24px boutons)
#   - contrastes eleves (bleu fonce / blanc / jaune accent)
#   - boutons larges et bien espaces
#   - focus visible pour la navigation clavier
st.markdown(
    """
    <style>
    /* Augmente la taille de base de tout le texte */
    html, body, [class*="css"] {
        font-size: 18px !important;
    }
    /* Titres bien marques */
    h1 { font-size: 2.4rem !important; color: #003399 !important; }
    h2 { font-size: 1.8rem !important; color: #003399 !important; }
    h3 { font-size: 1.4rem !important; color: #333333 !important; }

    /* Boutons larges, contrastes, focus visible */
    .stButton > button, .stDownloadButton > button {
        font-size: 1.2rem !important;
        font-weight: 600 !important;
        padding: 0.8rem 1.5rem !important;
        border-radius: 12px !important;
        width: 100% !important;
        background-color: #003399 !important;
        color: #FFFFFF !important;
        border: 3px solid transparent !important;
    }
    .stButton > button:hover, .stDownloadButton > button:hover {
        background-color: #0055CC !important;
    }
    .stButton > button:focus, .stDownloadButton > button:focus {
        border: 3px solid #FFCC00 !important;
        outline: none !important;
    }

    /* Encadres d'information bien marques */
    .stAlert {
        font-size: 1.1rem !important;
        border-radius: 10px !important;
        border-left-width: 6px !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# -- Initialisation du session_state (memoire de la session, RGPD-safe) -------
# Tout ce qui est stocke dans st.session_state est purement en RAM cote serveur
# et disparait des que l'onglet est ferme. Aucune ecriture disque / DB.
for cle, defaut in [
    ("texte_transcrit", ""),
    ("donnees_extraites", None),
    ("pdf_bytes", None),
]:
    if cle not in st.session_state:
        st.session_state[cle] = defaut


# -- En-tete -----------------------------------------------------------------
st.title("🚀 OrientaPro")
st.markdown("### Je raconte mon projet. L'application m'aide a le structurer.")

st.info(
    "👉 **3 etapes simples :** "
    "1. Je parle ou j'ecris  •  "
    "2. L'IA analyse mon projet  •  "
    "3. Je telecharge mon dossier PDF"
)


# -- ETAPE 1 : Saisie (vocale OU texte) --------------------------------------
st.markdown("---")
st.header("1️⃣ Je raconte mon projet")

st.markdown(
    "Parlez librement de votre projet : votre situation, votre idee, "
    "ce dont vous avez besoin, combien d'argent il vous faut..."
)

# Onglets pour proposer les deux modes de saisie cote a cote.
# `st.audio_input` est natif Streamlit (>=1.31) : pas de dependance externe,
# fonctionne en HTTPS dans tous les navigateurs modernes.
onglet_micro, onglet_texte = st.tabs(["🎤 Au micro", "⌨️ Au clavier"])

with onglet_micro:
    st.markdown("**Appuyez sur le bouton micro, parlez, puis relachez.**")
    audio = st.audio_input("Enregistrement vocal", label_visibility="collapsed")

    if audio is not None:
        # `audio` est un objet UploadedFile -> on lit ses bytes une seule fois.
        audio_bytes = audio.read()
        if st.button("📝 Transcrire mon enregistrement", key="btn_transcrire"):
            with st.spinner("Transcription en cours... merci de patienter."):
                try:
                    texte = transcrire_audio(audio_bytes)
                    if not texte:
                        st.warning(
                            "⚠️ Aucun texte detecte. "
                            "Verifiez votre microphone et reessayez."
                        )
                    else:
                        st.session_state.texte_transcrit = texte
                        # On invalide les etapes suivantes : si on re-transcrit,
                        # on doit re-analyser et re-generer le PDF.
                        st.session_state.donnees_extraites = None
                        st.session_state.pdf_bytes = None
                        st.success("✅ Transcription terminee.")
                except RuntimeError as exc:
                    st.error(f"❌ {exc}")

with onglet_texte:
    # Permet aussi de corriger / completer la transcription a la main.
    texte_saisi = st.text_area(
        "Ecrivez votre projet ici",
        value=st.session_state.texte_transcrit,
        height=200,
        placeholder=(
            "Exemple : Je m'appelle Fatou, je suis en QPV a Strasbourg. "
            "Je veux ouvrir un salon de coiffure. J'ai besoin de 15 000 euros, "
            "j'ai 3 000 euros d'apport. Je ne sais pas comment faire un business plan."
        ),
    )
    if texte_saisi != st.session_state.texte_transcrit:
        st.session_state.texte_transcrit = texte_saisi
        st.session_state.donnees_extraites = None
        st.session_state.pdf_bytes = None


# -- ETAPE 2 : Analyse IA ----------------------------------------------------
st.markdown("---")
st.header("2️⃣ L'IA analyse mon projet")

# Le bouton n'est actif que si on a du texte a analyser : on guide ainsi
# l'utilisateur dans l'ordre des etapes (UX FALC = pas de mauvaise surprise).
analyse_possible = bool(st.session_state.texte_transcrit.strip())

if not analyse_possible:
    st.warning("⬆️ Commencez par parler ou ecrire votre projet ci-dessus.")
else:
    if st.button("🤖 Analyser mon projet", key="btn_analyser"):
        with st.spinner("L'IA analyse votre recit..."):
            try:
                donnees = analyser_texte(st.session_state.texte_transcrit)
                st.session_state.donnees_extraites = donnees
                # On invalide le PDF puisque les donnees ont change.
                st.session_state.pdf_bytes = None
                st.success("✅ Analyse terminee.")
            except RuntimeError as exc:
                st.error(f"❌ {exc}")

# Affichage du resultat structure si dispo, sous forme de "fiche" lisible.
if st.session_state.donnees_extraites:
    d = st.session_state.donnees_extraites
    st.markdown("#### 📋 Voici ce que l'IA a compris :")

    # On utilise des colonnes pour structurer visuellement la fiche.
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**👤 Statut social**\n\n{d['statut_social']}")
        st.markdown(f"**🏢 Secteur**\n\n{d['secteur']}")
    with col2:
        st.markdown(f"**💰 Besoin total**\n\n{d['besoin_total_eur']:,} €".replace(",", " "))
        st.markdown(f"**🏦 Apport personnel**\n\n{d['apport_personnel_eur']:,} €".replace(",", " "))

    accompagnement = d["besoins_accompagnement"]
    if accompagnement:
        st.markdown("**🤝 Besoins d'accompagnement**")
        for besoin in accompagnement:
            st.markdown(f"- {besoin}")
    else:
        st.markdown("**🤝 Besoins d'accompagnement** : aucun precise")

    # JSON brut, replie par defaut : utile pour le conseiller / l'export systeme.
    with st.expander("🔧 Voir le JSON brut (interoperabilite Bpifrance)"):
        st.json(d)


# -- ETAPE 3 : Export PDF ----------------------------------------------------
st.markdown("---")
st.header("3️⃣ Je telecharge mon dossier")

export_possible = st.session_state.donnees_extraites is not None

if not export_possible:
    st.warning("⬆️ Lancez d'abord l'analyse IA ci-dessus.")
else:
    # Generation paresseuse : on ne (re)genere le PDF que si besoin.
    if st.session_state.pdf_bytes is None:
        with st.spinner("Generation du PDF..."):
            st.session_state.pdf_bytes = generer_pdf(
                st.session_state.donnees_extraites,
                st.session_state.texte_transcrit,
            )

    nom_fichier = f"orientapro_dossier_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    st.download_button(
        label="📄 Telecharger mon dossier PDF",
        data=st.session_state.pdf_bytes,
        file_name=nom_fichier,
        mime="application/pdf",
        key="btn_download",
    )
    st.success(
        "✅ Votre dossier est pret. "
        "Vous pouvez le presenter a un conseiller BGE, CCI ou CMA."
    )


# -- Footer RGPD -------------------------------------------------------------
st.markdown("---")
st.caption(
    "🔒 **Confidentialite** : aucune donnee n'est enregistree. "
    "Tout est traite en memoire puis efface a la fermeture de l'onglet. "
    "Conforme RGPD."
)
