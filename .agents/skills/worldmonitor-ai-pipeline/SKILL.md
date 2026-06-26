---
name: worldmonitor-ai-pipeline
description: Implementing real-time intelligence summarization, sentiment classification, and Country Instability Index (CII) tracking.
---
# World Monitor AI Pipeline

Use this skill when developing intelligence ingestion, news summarization, sentiment scoring, or geopolitical risk calculations matching the World Monitor spec.

## In-Browser Machine Learning (Transformers.js)

For user privacy and decentralized scaling, the client-side dashboard performs initial NLP tasks directly in the browser:

*   **Execution in Web Workers**: NLP processing runs on separate threads using Web Workers so that heavy model computation does not freeze the map's frame rate.
*   **Tasks**:
    *   **Sentiment Analysis**: Categorizes news articles into positive, neutral, or negative sentiment.
    *   **Named Entity Recognition (NER)**: Identifies key entities (e.g. military units, politicians, companies, cities).
    *   **Threat Classification**: Scores stories based on threat vectors (e.g. cyber, military, climate, economy).

## Geopolitical Risk: Country Instability Index (CII)

The system calculates a real-time risk index (0 to 100) per nation to map global tension hotspots:

1.  **Baseline Risk Factor**: Historical indices and long-term economic metrics.
2.  **Unrest and Protests**: Volatility calculated from localized riot/unrest feeds.
3.  **Conflict & Security Events**: Real-time event streams (e.g. border skirmishes, drone strikes, infrastructure outages).
4.  **Information Velocity**: The rate of publication and share-of-voice trends in target regions.

## Server-Side and Local LLM Integrations

*   **Ollama/LM Studio Integration**: Provides local, private LLM execution (such as Llama 3 or Mistral) for analyzing intelligence logs offline.
*   **Edge Fallbacks**: Integrates serverless API calls to Groq or OpenRouter to produce high-speed global summary briefs and event timeline compilations.
