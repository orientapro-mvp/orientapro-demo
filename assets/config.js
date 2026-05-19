// assets/config.js — Configuration du front OrientaPro
// Édite RAG_API_URL après avoir déployé ton backend sur Hugging Face Spaces.
window.ORIENTAPRO_CONFIG = {
  // En dev local : http://localhost:8000
  // En prod (HF Spaces) : https://<ton-user>-orientapro-rag.hf.space
  RAG_API_URL: "http://localhost:8000",

  // Mettre à false pour désactiver les fonctionnalités RAG (mode dégradé)
  RAG_ENABLED: true,

  // Délai max d'attente d'une réponse Mistral (en ms)
  RAG_TIMEOUT_MS: 25000,
};
