# 🧠 MindTrace: AI Model Architecture

This document provides a technical deep dive into the AI/ML models that power the MindTrace ecosystem. MindTrace utilizes a hybrid approach, combining local edge-optimized models for real-time sensing with state-of-the-art cloud LLMs for cognitive reasoning.

---

## 👁️ Computer Vision: Face Recognition

### Model: InsightFace (`buffalo_s`)
- **Type**: Deep Face Analysis Stack
- **Implementation**: `server/ai_engine/face_engine.py`
- **Model Details**: The `buffalo_s` model is a lightweight version of the InsightFace stack, comprising a RetinaFace detector and an ArcFace embedder.

#### How it is used:
1. **Detection**: Captures video frames from the Glass HUD or Dashboard and identifies bounding boxes for all present faces.
2. **Embedding Generation**: Transforms each face into a 512-dimensional vector (embedding) that represents unique identity features.
3. **Identity Resolution**: Compares the live embedding against the **ChromaDB** vector database to find the closest match among stored contacts.

#### Why it was used:
- **Real-Time Performance**: `buffalo_s` is specifically designed for low-latency scenarios, making it suitable for wearable HUDs where immediate identification is required.
- **Accuracy**: Despite its small size, it maintains high precision for close-range social interactions.

---

## 🎙️ Speech-To-Text: Ambient Transcription

### Model: Faster Whisper (`base.en`)
- **Type**: Automatic Speech Recognition (ASR)
- **Implementation**: `server/ai_engine/asr/asr_engine.py`
- **Model Details**: A reimplementation of OpenAI's Whisper model using CTranslate2, optimized for significantly faster inference.

#### How it is used:
1. **Voice Activity Detection (VAD)**: Monitors audio streams and only triggers transcription when human speech is detected (via `webrtcvad`).
2. **Ambient Transcription**: Continuously transcribes interactions in the background during social encounters.
3. **Contextual Tagging**: Links transcribed text to the person currently identified by the Computer Vision engine.

#### Why it was used:
- **Local Execution**: Faster Whisper can run efficiently on modern CPUs (like Apple Silicon) without requiring a heavy GPU setup, ensuring privacy and reducing API costs.
- **Robustness**: It handles varied accents and background noise better than traditional ASR models.

---

## 🧠 Natural Language: Cognitive Engine

### Model: Google Gemini (`gemini-2.5-flash`)
- **Type**: Multimodal Large Language Model (LLM)
- **Implementation**: `server/ai_engine/rag_engine.py` & `server/ai_engine/summarizer.py`
- **Model Details**: Part of the Gemini 1.5/2.x family, optimized for speed and multimodal comprehension.

#### How it is used:
1. **RAG (Retrieval-Augmented Generation)**: Answers user queries by searching the ChromaDB memory store and the PostgreSQL contact database.
2. **Social Insight Generation**: Analyzes long-term interaction patterns to provide advice on social health and relationship maintenance.
3. **Summarization**: Condenses hours of transcribed meetings or hangouts into concise, searchable summaries.

#### Why it was used:
- **Massive Context Window**: Allows the system to process large histories of interaction data simultaneously.
- **Low Latency**: The "Flash" variant provides nearly instantaneous responses, which is vital for a conversational "Second Brain" experience.

---

## 📂 Vector Storage: Semantic Memory

### Model: ChromaDB
- **Type**: Vector Database/Embedding Store
- **Implementation**: `server/app/chroma_client.py`

#### How it is used:
1. **Face Embedding Index**: Stores and retrieves facial vectors for the Identity Service.
2. **Text Embedding Index**: Stores transcribed conversation snippets for semantic search.

#### Why it was used:
- **Semantic Retrieval**: Allows the user to search for *meaning* (e.g., "the person I talked to about hiking") rather than just keywords.
- **Ease of Deployment**: Operates as a lightweight, developer-friendly vector store that integrates seamlessly with FastAPI.

---

## ⚙️ Model Orchestration

MindTrace uses **LangChain** to coordinate the flow of information between these models. For instance, when a user asks a question:
1. The **RAG Engine** queries **ChromaDB**.
2. Relevant transcripts and contact metadata are retrieved.
3. **Gemini** synthesizes this data into a natural-sounding, context-aware response.
