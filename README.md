# MindTrace

> **AI-Powered Memory Assistant for Smart Glasses**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.123-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red?style=flat-square)](https://www.sqlalchemy.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-orange?style=flat-square)](https://www.trychroma.com/)
[![InsightFace](https://img.shields.io/badge/InsightFace-ArcFace-purple?style=flat-square)](https://github.com/deepinsight/insightface)
[![Whisper](https://img.shields.io/badge/OpenAI-Whisper-412991?style=flat-square&logo=openai&logoColor=white)](https://github.com/openai/whisper)
[![Gemini](https://img.shields.io/badge/Google-Gemini_2.5-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](http://makeapullrequest.com)

---

## Overview

MindTrace is a production-ready AI memory assistant designed for Ray-Ban Meta smart glasses and similar wearable devices. It combines real-time face recognition, live speech transcription, and context-aware AI assistance to help users—particularly those with memory challenges—navigate social interactions with confidence.

### Core Capabilities

- **Real-Time Face Recognition**: Instant identification using InsightFace with ArcFace embeddings
- **Live Speech-to-Text**: Continuous transcription via OpenAI Whisper with WebRTC VAD
- **Context-Aware AI Assistant**: Google Gemini-powered chat with full access to user data
- **AI Summarizer & Insights**: Generate conversation summaries and behavioral insights via RAG
- **Vector Search**: ChromaDB for semantic search across conversations and face embeddings
- **Emergency SOS System**: One-touch alerts with GPS location sharing
- **Smart Reminders**: Medication, meal, and activity scheduling with notifications
- **Comprehensive Dashboard**: Mobile-responsive web interface for caregivers and users

---

## Key Features

### Real-Time Face Recognition

**Technology Stack:**
- **Detection**: RetinaFace (InsightFace buffalo_l model)
- **Embedding**: ArcFace (512-dimensional face embeddings)
- **Storage**: ChromaDB with cosine similarity search
- **Threshold**: 0.45 similarity score for positive identification

**How It Works:**
1. Camera captures frame from smart glasses
2. RetinaFace detects all faces with bounding boxes
3. ArcFace generates 512-dim embeddings for each face
4. ChromaDB performs vector similarity search against stored contacts
5. Results streamed back to HUD overlay with name, relationship, and confidence

### Live Speech-to-Text

**Technology Stack:**
- **ASR Model**: OpenAI Whisper (base model, English)
- **VAD**: WebRTC Voice Activity Detection (aggressiveness=2)
- **Streaming**: WebSocket with 30ms frame duration
- **Sample Rate**: 16kHz mono audio

**Pipeline:**
1. Audio captured from smart glasses microphone
2. WebRTC VAD filters non-speech frames
3. Speech segments buffered and sent to Whisper
4. Transcriptions streamed to HUD in real-time
5. Full conversations stored in ChromaDB for semantic search

### Context-Aware AI Assistant & Summarizer

**Technology Stack:**
- **Model**: Google Gemini 2.5 Flash Lite
- **Context Window**: 2048 tokens output, ~10 message history
- **RAG**: ChromaDB based retrieval for relevant past interactions

**Features:**
- **Multi-turn Chat**: Natural conversations about your history
- **Summarization**: Generate brief, detailed, or analytical summaries of interactions over time
- **Insights**: Discover patterns in your conversations (e.g., "Health topics", "Family interactions")

### Mobile-Responsive Dashboard

The web dashboard is fully optimized for mobile, tablet, and desktop:
- **Adaptive Layouts**: Grids transform to lists/cards on small screens
- **Touch-Optimized**: Larger touch targets for quick actions
- **Progressive Web App (PWA)**: Installable on home screen
- **Theme**: Modern glassmorphism UI with Tailwind CSS v4

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Smart Glasses                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Camera     │  │  Microphone  │  │  GPS/Sensors │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Glass Client (React 19)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  HUD Overlay: Face labels, Transcriptions, Alerts       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Server (Python)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Face/ASR     │  │  AI/Chat     │  │  Stats/Search│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ InsightFace  │  │   Whisper    │  │    Gemini    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   ChromaDB   │  │  File Store  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────┴───────────────────────────────────────────────────────┐
│                Dashboard Client (React 19)                       │
│  Contact Management │ Reminders │ SOS │ AI Insights │ History   │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Backend (Python)
- **Framework**: FastAPI 0.123+
- **Database**: PostgreSQL / SQLite (SQLAlchemy 2.0+)
- **Vector DB**: ChromaDB 0.5+
- **AI/ML**: InsightFace, OpenAI Whisper, Google Gemini
- **Utilities**: NumPy 2.0, OpenCV 4.10, PyAudio

#### Frontend (React 19)
- **Framework**: React 19.2
- **Build**: Vite 7.2
- **Styling**: Tailwind CSS 4.1
- **Icons**: Lucide React 0.555
- **Routing**: React Router 7.10

---

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10-3.12
- **uv** (Python package manager)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/mindtrace.git
cd mindtrace

# 2. Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Setup server
cd server
uv sync
# Copy example env
cp .env .env.bak  # (create your own .env if missing)
# Edit .env with your API keys

# 4. Setup dashboard
cd ../client
npm install
cp .env.example .env

# 5. Setup glass client (optional)
cd ../glass-client
npm install
cp .env.example .env
```

### Environment Variables (`server/.env`)

```env
# Server Configuration
PORT=8000
CLIENT_URL=http://localhost:5173
GLASS_URL=http://localhost:5174
SECRET_KEY=your-secret-key-here-min-32-chars

# AI Services (Required)
GEMINI_API_KEY=your-gemini-api-key-here

# Database
DATABASE_URL=sqlite:///./mindtrace.db  # or postgresql://...

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### Running the Application

```bash
# Terminal 1: Start server
cd server
uv run main.py
# Server runs at http://localhost:8000

# Terminal 2: Start dashboard
cd client
npm run dev
# Dashboard runs at http://localhost:5173

# Terminal 3: Start glass client (optional)
cd glass-client
npm run dev
# Glass HUD runs at http://localhost:5174
```

---

## Project Structure

```
mindtrace/
├── server/                          # FastAPI Backend
│   ├── main.py                      # Application entry point
│   ├── app/                         
│   │   ├── routes/                  
│   │   │   ├── aiRoutes.py          # AI Summarizer/Insights
│   │   │   ├── asrRoutes.py         # Speech-to-text WebSocket
│   │   │   ├── faceRoutes.py        # Face recognition API
│   │   │   ├── statsRoutes.py       # Dashboard statistics
│   │   │   └── ...
│   │   └── services/                
│   │       └── ai_service.py        # Gemini AI integration
│   ├── ai_engine/                   # ML Models
│   └── data/                        # Local storage
│
├── client/                          # Dashboard (React 19 + Vite)
│   ├── src/
│   │   ├── pages/                   
│   │   │   ├── AiSummarizer.jsx     # AI Insights/Summary Page
│   │   │   ├── DashboardHome.jsx    
│   │   │   └── ...
│   │   └── components/              
│   │       ├── Sidebar.jsx          # Responsive Navigation
│   │       └── ...
│
└── glass-client/                    # Smart Glasses HUD
    └── src/
        └── pages/
            └── FaceRecognition.jsx  # Main HUD page
```

---

## API Documentation

### AI Services

#### POST `/ai/summarize`
Generate a summary of interactions.

**Request:**
```json
{
  "summary_type": "brief",
  "days": 7,
  "contact_id": 123
}
```

#### POST `/ai/rag/multi-turn`
Chat with your memory.

**Request:**
```json
{
  "question": "What did I discuss with Sarah?",
  "conversation_history": []
}
```

(See `server/app/routes` for full API definitions)

---

## License

MIT License
