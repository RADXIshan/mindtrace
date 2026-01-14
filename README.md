# MindTrace

> **AI-Powered Memory Assistant for Smart Glasses**

<div align="center">

![Smart Glasses Integration](screenshots/meta-glasses.jpeg)

*Empowering users with memory challenges through real-time AI assistance on wearable devices*

</div>

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.123-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red?style=flat-square)](https://www.sqlalchemy.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4.22-orange?style=flat-square)](https://www.trychroma.com/)
[![InsightFace](https://img.shields.io/badge/InsightFace-Buffalo_S-purple?style=flat-square)](https://github.com/deepinsight/insightface)
[![Faster Whisper](https://img.shields.io/badge/Faster_Whisper-1.2-412991?style=flat-square)](https://github.com/SYSTRAN/faster-whisper)
[![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![LangChain](https://img.shields.io/badge/LangChain-1.1-green?style=flat-square)](https://www.langchain.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.9-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](http://makeapullrequest.com)

<div align="center">

**[📸 View Screenshots](#screenshots) • [🚀 Quick Start](#quick-start) • [📚 API Docs](#api-documentation) • [🤝 Contributing](#contributing)**

</div>

---

## Overview

MindTrace is a production-ready AI memory assistant designed for Ray-Ban Meta smart glasses and similar wearable devices. It combines real-time face recognition, live speech transcription, and context-aware AI assistance to help users—particularly those with memory challenges—navigate social interactions with confidence.

> 💡 **See it in action**: Check out the [Screenshots](#screenshots) section below to explore the dashboard, smart glasses HUD, and key features.

### Core Capabilities

- **Real-Time Face Recognition**: Instant identification using InsightFace Buffalo-S with ArcFace embeddings
- **Live Speech-to-Text**: Continuous transcription via Faster Whisper with WebRTC VAD
- **Context-Aware AI Assistant**: Google Gemini 2.5 Flash-powered chat with RAG over user data
- **AI Summarizer & Insights**: Generate conversation summaries and behavioral insights
- **Vector Search**: ChromaDB for semantic search across conversations and face embeddings
- **Emergency SOS System**: One-touch alerts with GPS location sharing
- **Smart Reminders**: Medication, meal, and activity scheduling with notifications
- **Comprehensive Dashboard**: Mobile-responsive web interface for caregivers and users

---

## Screenshots

<div align="center">

### Dashboard Overview
![Dashboard](screenshots/dashboard.jpeg)
*Main dashboard showing interaction statistics, recent contacts, and quick access to key features*

### Contact Management
![Contact Management](screenshots/contact.jpeg)
*Manage contacts with profile photos, relationships, and interaction history*

### AI Summarizer & Insights
![AI Summarizer](screenshots/ai-summarizer.jpg)
*Generate intelligent summaries and insights from your interaction history*

### Smart Reminders
![Reminders](screenshots/reminder.jpeg)
*Set medication, meal, and activity reminders with customizable schedules*

### Emergency SOS System
![SOS](screenshots/sos.jpeg)
*One-touch emergency alerts with GPS location sharing for caregivers*

### Smart Glasses Integration
![Meta Glasses](screenshots/meta-glasses.jpeg)
*Real-time HUD overlay on Ray-Ban Meta smart glasses with face recognition and transcription*

</div>

---

## Key Features


### Real-Time Face Recognition

**Technology Stack:**
- **Detection Model**: RetinaFace (InsightFace Buffalo-S)
- **Embedding Model**: ArcFace (512-dimensional face embeddings)
- **Inference**: ONNX Runtime 1.23.2 with CPU optimization
- **Storage**: ChromaDB with cosine similarity search
- **Threshold**: 0.45 similarity score for positive identification
- **Detection Size**: 320x320 for optimal speed/accuracy balance

**How It Works:**
1. Camera captures frame from smart glasses
2. RetinaFace detects all faces with bounding boxes (det_score ≥ 0.5)
3. ArcFace generates 512-dim embeddings for each detected face
4. ChromaDB performs vector similarity search against stored contacts
5. Results streamed back to HUD overlay with name, relationship, and confidence
6. Multi-face detection supported with sorted results by confidence

**Performance:**
- Detection: ~50-100ms per frame on CPU
- Recognition: ~20-30ms per face
- Model warmup on server startup for zero cold-start latency

### Live Speech-to-Text

**Technology Stack:**
- **ASR Model**: Faster Whisper (base.en model)
- **Backend**: CTranslate2 with INT8 quantization
- **VAD**: WebRTC Voice Activity Detection (aggressiveness=2, min_silence=500ms)
- **Streaming**: WebSocket with 30ms frame duration
- **Sample Rate**: 16kHz mono audio
- **Beam Size**: 1 (greedy decoding for maximum speed)

**Pipeline:**
1. Audio captured from smart glasses microphone
2. WebRTC VAD filters non-speech frames
3. Speech segments buffered and sent to Faster Whisper
4. Transcriptions streamed to HUD in real-time
5. Full conversations stored in ChromaDB for semantic search
6. Conversation history maintained with automatic session management

**Optimizations:**
- INT8 quantization for 3-4x speedup
- VAD filtering reduces unnecessary processing
- Greedy decoding prevents hallucinations on short chunks
- Transcript caching for smoother output


### Context-Aware AI Assistant & Summarizer

**Technology Stack:**
- **Model**: Google Gemini 2.5 Flash
- **RAG Framework**: LangChain 1.1+ with HuggingFace embeddings
- **Vector DB**: ChromaDB with all-MiniLM-L6-v2 embeddings
- **Context Window**: Multi-turn conversation history (last 3 turns)
- **Retrieval**: Top-K semantic search (K=5-30 depending on query type)

**Features:**
- **Multi-turn Chat**: Natural conversations about your history with context retention
- **Summarization**: Generate brief, detailed, or analytical summaries of interactions
  - Brief: 2-3 paragraphs highlighting key patterns
  - Detailed: Comprehensive breakdown by person, timeline, and topics
  - Analytical: Insights, trends, and relationship recommendations
- **Insights**: Discover patterns in conversations (health topics, family interactions, etc.)
- **Contact-Aware**: Integrates PostgreSQL contact data with ChromaDB interactions
- **Statistics**: Real-time aggregation of interaction counts, frequencies, and trends
- **Plain Text Output**: No markdown formatting for clean HUD display

**RAG Pipeline:**
1. Query analysis to determine data sources (contacts, stats, interactions)
2. Semantic search across ChromaDB conversation collection
3. Structured queries to PostgreSQL for contact info and statistics
4. Context assembly with contact details, stats, and relevant interactions
5. Prompt engineering with strict anti-hallucination instructions
6. Gemini 2.5 Flash generation with plain text formatting

**Supported Query Types:**
- Contact information ("Who is Sarah?", "What's John's phone number?")
- Interaction history ("What did I discuss with Mom last week?")
- Statistics ("How many times did I talk to my doctor?")
- Temporal queries ("When did I last see my neighbor?")
- Pattern analysis ("What topics do I discuss most with family?")


### Mobile-Responsive Dashboard

**Technology Stack:**
- **Framework**: React 19.2 with React Router 7.10
- **Build Tool**: Vite 7.2 for lightning-fast HMR
- **Styling**: Tailwind CSS 4.1 with glassmorphism design
- **Icons**: Lucide React 0.555
- **Animations**: Framer Motion 12.23
- **Maps**: React Leaflet 5.0 for GPS tracking
- **HTTP Client**: Axios 1.13

**Features:**
- **Adaptive Layouts**: Grids transform to lists/cards on small screens
- **Touch-Optimized**: Larger touch targets for mobile interactions
- **Progressive Web App (PWA)**: Installable on home screen
- **Theme**: Modern glassmorphism UI with smooth animations
- **Real-time Updates**: Live data synchronization with backend
- **Responsive Navigation**: Collapsible sidebar for mobile devices

**Pages:**
- Dashboard Home: Quick stats, recent interactions, and alerts
- Contact Management: Add, edit, delete contacts with profile photos
- Interaction History: Searchable timeline of all interactions
- AI Summarizer: Generate insights and summaries
- Reminders: Medication, meal, and activity scheduling
- SOS: Emergency alert system with GPS tracking
- Settings: User preferences and system configuration

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
│  │ Face/ASR     │  │  AI/RAG      │  │  Stats/Search│          │
│  │ Routes       │  │  Routes      │  │  Routes      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ InsightFace  │  │Faster Whisper│  │   Gemini     │          │
│  │ Buffalo-S    │  │  + WebRTC    │  │  2.5 Flash   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   ChromaDB   │  │  File Store  │          │
│  │  /SQLite     │  │   (Vectors)  │  │  (Photos)    │          │
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

#### Backend (Python 3.10+)

**Core Framework:**
- FastAPI 0.123+ (async web framework)
- Uvicorn 0.38+ (ASGI server)
- SQLAlchemy 2.0+ (ORM)
- Pydantic 2.12+ (data validation)

**AI/ML Models:**
- **Face Recognition**: InsightFace (Buffalo-S model with RetinaFace + ArcFace)
- **Speech-to-Text**: Faster Whisper 1.2+ (base.en model with CTranslate2)
- **LLM**: Google Gemini 2.5 Flash via google-genai 1.0+
- **Embeddings**: LangChain + HuggingFace (all-MiniLM-L6-v2)

**Deep Learning:**
- PyTorch 2.9+ (neural network framework)
- TorchVision 0.24+ (computer vision utilities)
- TorchAudio 2.9+ (audio processing)
- Transformers 4.57+ (HuggingFace models)
- ONNX 1.20 + ONNX Runtime 1.23 (optimized inference)

**Computer Vision:**
- OpenCV 4.10+ (image processing)
- Pillow 12.0 (image manipulation)
- scikit-image 0.25 (advanced image processing)
- Albumentations 2.0 (image augmentation)

**Audio Processing:**
- SoundDevice 0.5+ (audio I/O)
- WebRTC VAD 2.0+ (voice activity detection)
- NumPy 2.0+ (numerical computing)

**Vector Database:**
- ChromaDB 0.4.22+ (vector storage and similarity search)

**Relational Database:**
- PostgreSQL 13+ (production) / SQLite (development)
- psycopg2-binary 2.9+ (PostgreSQL adapter)

**Authentication & Security:**
- python-jose 3.5+ (JWT tokens)
- passlib 1.7+ with bcrypt 4.1 (password hashing)
- python-multipart 0.0.20+ (file uploads)

**Utilities:**
- python-dotenv 1.2+ (environment variables)
- httpx 0.28+ (async HTTP client)
- requests 2.32 (HTTP client)
- pyyaml 6.0 (YAML parsing)
- python-dateutil 2.9 (date utilities)
- tqdm 4.67 (progress bars)
- coloredlogs 15.0 (colored logging)

**Scientific Computing:**
- NumPy 2.0+ (arrays and matrices)
- SciPy 1.15+ (scientific algorithms)
- scikit-learn 1.7+ (machine learning utilities)
- matplotlib 3.10+ (plotting)


#### Frontend (React 19)

**Dashboard Client:**
- React 19.2 (UI framework)
- React Router 7.10 (routing)
- Vite 7.2 (build tool)
- Tailwind CSS 4.1 (styling)
- Lucide React 0.555 (icons)
- Framer Motion 12.23 (animations)
- Axios 1.13 (HTTP client)
- React Hot Toast 2.6 (notifications)
- React Leaflet 5.0 (maps)
- Lenis 1.3 (smooth scrolling)

**Glass Client:**
- React 19.2 (UI framework)
- React Router 7.10 (routing)
- Vite 7.2 (build tool)
- Tailwind CSS 4.1 (styling)
- Lucide React 0.555 (icons)
- Axios 1.13 (HTTP client)

**Development Tools:**
- ESLint 9.39 (linting)
- Vite Plugin React 5.1 (Fast Refresh)
- TypeScript types for React 19.2

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10-3.12
- **uv** (Python package manager) - [Installation Guide](https://docs.astral.sh/uv/getting-started/installation/)
- **PostgreSQL** 13+ (optional, SQLite works for development)
- **ChromaDB** server (optional, can use embedded mode)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/mindtrace.git
cd mindtrace

# 2. Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Setup server
cd server
uv sync  # Installs all dependencies from pyproject.toml

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# 5. Setup dashboard client
cd ../client
npm install
cp .env.example .env

# 6. Setup glass client (optional)
cd ../glass-client
npm install
cp .env.example .env
```


### Environment Variables

#### Server Configuration (`server/.env`)

```env
# Server Configuration
PORT=8000
CLIENT_URL=http://localhost:5173
GLASS_URL=http://localhost:5174
SECRET_KEY=your-secret-key-here-min-32-chars-for-jwt

# AI Services (Required)
GEMINI_API_KEY=your-gemini-api-key-here

# Database (PostgreSQL or SQLite)
DATABASE_URL=sqlite:///./mindtrace.db
# For PostgreSQL: postgresql://user:password@localhost:5432/mindtrace

# ChromaDB Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_API_KEY=  # Optional, for cloud ChromaDB
CHROMA_TENANT=default_tenant
CHROMA_DATABASE=default_database
```

#### Client Configuration (`client/.env`)

```env
VITE_API_URL=http://localhost:8000
```

#### Glass Client Configuration (`glass-client/.env`)

```env
VITE_API_URL=http://localhost:8000
```

### Running the Application

```bash
# Terminal 1: Start ChromaDB (if using external server)
# Skip this if using embedded mode
chroma run --host localhost --port 8000

# Terminal 2: Start FastAPI server
cd server
uv run main.py
# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs

# Terminal 3: Start dashboard client
cd client
npm run dev
# Dashboard runs at http://localhost:5173

# Terminal 4: Start glass client (optional)
cd glass-client
npm run dev
# Glass HUD runs at http://localhost:5174
```

### First-Time Setup

1. **Create an account**: Navigate to `http://localhost:5173` and register
2. **Add contacts**: Upload profile photos and contact information
3. **Sync face embeddings**: The system will automatically generate face embeddings
4. **Test face recognition**: Use the glass client to test real-time recognition
5. **Record interactions**: Start conversations and see transcriptions in real-time
6. **Explore AI features**: Try the summarizer and chat with your memory


---

## Project Structure

```
mindtrace/
├── server/                          # FastAPI Backend
│   ├── main.py                      # Application entry point
│   ├── pyproject.toml               # Python dependencies (uv)
│   ├── requirements.txt             # Python dependencies (pip)
│   ├── .env                         # Environment variables
│   │
│   ├── app/                         # Main application package
│   │   ├── app.py                   # FastAPI app initialization
│   │   ├── database.py              # SQLAlchemy database setup
│   │   ├── models.py                # Database models
│   │   ├── chroma_client.py         # ChromaDB client singleton
│   │   ├── scheduler.py             # Reminder scheduler
│   │   │
│   │   └── routes/                  # API route handlers
│   │       ├── authRoutes.py        # Authentication (login, register)
│   │       ├── faceRoutes.py        # Face recognition API
│   │       ├── asrRoutes.py         # Speech-to-text WebSocket
│   │       ├── aiRoutes.py          # AI Summarizer & RAG
│   │       ├── contactRoutes.py     # Contact CRUD operations
│   │       ├── interactionRoutes.py # Interaction history
│   │       ├── reminderRoutes.py    # Reminder management
│   │       ├── sosRoutes.py         # Emergency SOS system
│   │       ├── statsRoutes.py       # Dashboard statistics
│   │       ├── searchRoutes.py      # Semantic search
│   │       ├── chatRoutes.py        # AI chat interface
│   │       ├── alertRoutes.py       # Alert management
│   │       └── userRoutes.py        # User profile management
│   │
│   ├── ai_engine/                   # ML/AI Models
│   │   ├── face_engine.py           # InsightFace (Buffalo-S)
│   │   ├── rag_engine.py            # RAG with Gemini 2.5 Flash
│   │   ├── summarizer.py            # Interaction summarization
│   │   │
│   │   └── asr/                     # Speech recognition
│   │       ├── asr_engine.py        # Faster Whisper engine
│   │       └── conversation_store.py # Conversation management
│   │
│   └── data/                        # Local storage
│       ├── faces/                   # Face embeddings cache
│       └── conversations/           # Conversation transcripts
│
├── client/                          # Dashboard (React 19 + Vite)
│   ├── package.json                 # Node dependencies
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── index.html                   # HTML entry point
│   │
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Main app component
│       ├── index.css                # Global styles
│       │
│       ├── pages/                   # Page components
│       │   ├── DashboardHome.jsx    # Dashboard overview
│       │   ├── InteractionHistory.jsx # Interaction timeline
│       │   ├── AiSummarizer.jsx     # AI insights & summaries
│       │   ├── Contacts.jsx         # Contact management
│       │   ├── Reminders.jsx        # Reminder management
│       │   ├── SOS.jsx              # Emergency system
│       │   └── Settings.jsx         # User settings
│       │
│       ├── components/              # Reusable components
│       │   ├── DashboardLayout.jsx  # Layout wrapper
│       │   ├── Sidebar.jsx          # Navigation sidebar
│       │   ├── EditContactModal.jsx # Contact editor
│       │   ├── chatbot/             # AI chat components
│       │   └── ...
│       │
│       ├── services/                # API services
│       │   └── api.js               # Axios API client
│       │
│       ├── hooks/                   # Custom React hooks
│       ├── utils/                   # Utility functions
│       ├── constants/               # Constants and configs
│       └── types/                   # TypeScript types (JSDoc)
│
└── glass-client/                    # Smart Glasses HUD
    ├── package.json                 # Node dependencies
    ├── vite.config.js               # Vite configuration
    │
    └── src/
        ├── main.jsx                 # React entry point
        ├── App.jsx                  # Main app component
        │
        ├── pages/
        │   └── FaceRecognition.jsx  # Main HUD page
        │
        └── components/
            └── HUDOverlay.jsx       # Overlay UI component
```


---

## API Documentation

### Face Recognition

#### POST `/face/recognize`
Recognize faces in an uploaded image.

**Request:**
```json
{
  "image": "base64_encoded_image_data"
}
```

**Response:**
```json
{
  "faces": [
    {
      "name": "John Doe",
      "relation": "Friend",
      "confidence": 0.87,
      "bbox": [100, 150, 300, 400],
      "det_score": 0.95,
      "contact_id": 123
    }
  ]
}
```

#### POST `/face/sync`
Sync face embeddings from contact profile photos.

**Response:**
```json
{
  "success": true,
  "count": 15
}
```

### Speech-to-Text

#### WebSocket `/asr/stream`
Stream audio for real-time transcription.

**Message Format:**
```json
{
  "audio": "base64_encoded_audio_chunk",
  "user_id": 1,
  "contact_name": "John Doe"
}
```

**Response:**
```json
{
  "transcript": "Hello, how are you doing today?",
  "is_final": true
}
```

### AI Services

#### POST `/ai/summarize`
Generate a summary of interactions.

**Request:**
```json
{
  "summary_type": "brief",
  "days": 7,
  "contact_id": 123,
  "focus_areas": ["health", "family"]
}
```

**Response:**
```json
{
  "summary": "Over the past week, you had 5 interactions...",
  "interaction_count": 5,
  "time_period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-07T23:59:59Z",
    "days": 7
  }
}
```

#### POST `/ai/rag/query`
Ask questions about your interaction history.

**Request:**
```json
{
  "question": "What did I discuss with Sarah last week?",
  "user_id": 1,
  "n_results": 10
}
```

**Response:**
```json
{
  "answer": "Last week, you discussed...",
  "sources": [
    {
      "interaction_id": 456,
      "contact_name": "Sarah",
      "timestamp": "2024-01-05T14:30:00Z",
      "relevance_score": 0.92,
      "snippet": "We talked about the upcoming project..."
    }
  ],
  "retrieved_count": 5
}
```

#### POST `/ai/rag/multi-turn`
Multi-turn conversation with context.

**Request:**
```json
{
  "question": "What about her family?",
  "user_id": 1,
  "conversation_history": [
    {
      "question": "What did I discuss with Sarah?",
      "answer": "You discussed work projects..."
    }
  ]
}
```

#### POST `/ai/insights`
Generate insights about interaction patterns.

**Request:**
```json
{
  "user_id": 1,
  "topic": "health"
}
```

**Response:**
```json
{
  "insights": "Your health-related interactions show...",
  "analyzed_interactions": 30,
  "total_contacts": 15
}
```


### Contacts

#### GET `/contacts`
Get all contacts for a user.

**Response:**
```json
{
  "contacts": [
    {
      "id": 1,
      "name": "John Doe",
      "relationship": "friend",
      "relationship_detail": "College friend",
      "phone_number": "+1234567890",
      "email": "john@example.com",
      "notes": "Met at university",
      "visit_frequency": "weekly",
      "last_seen": "2024-01-05T14:30:00Z"
    }
  ]
}
```

#### POST `/contacts`
Create a new contact with optional profile photo.

**Request (multipart/form-data):**
```
name: "Jane Smith"
relationship: "family"
relationship_detail: "Sister"
phone_number: "+1234567890"
email: "jane@example.com"
profile_photo: [file]
```

#### PUT `/contacts/{contact_id}`
Update contact information.

#### DELETE `/contacts/{contact_id}`
Delete a contact.

### Interactions

#### GET `/interactions`
Get interaction history with optional filters.

**Query Parameters:**
- `contact_id`: Filter by contact
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `limit`: Number of results (default: 50)

#### POST `/interactions`
Create a new interaction record.

**Request:**
```json
{
  "contact_id": 1,
  "contact_name": "John Doe",
  "summary": "Discussed project timeline",
  "full_details": "We talked about...",
  "key_topics": ["work", "deadlines"],
  "location": "Office"
}
```

### Statistics

#### GET `/stats/dashboard`
Get dashboard statistics.

**Response:**
```json
{
  "total_contacts": 25,
  "total_interactions": 150,
  "interactions_this_week": 12,
  "interactions_this_month": 45,
  "top_contacts": [
    {
      "name": "John Doe",
      "count": 20,
      "last_interaction": "2024-01-05T14:30:00Z"
    }
  ],
  "recent_interactions": [...],
  "interaction_trend": [...]
}
```

### Search

#### POST `/search/semantic`
Semantic search across interactions.

**Request:**
```json
{
  "query": "health discussions",
  "user_id": 1,
  "n_results": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "interaction_id": 123,
      "contact_name": "Dr. Smith",
      "timestamp": "2024-01-03T10:00:00Z",
      "content": "Discussed blood pressure...",
      "relevance_score": 0.89
    }
  ]
}
```

For complete API documentation, visit `http://localhost:8000/docs` after starting the server.


---

## Model Details

### Face Recognition: InsightFace Buffalo-S

**Model Architecture:**
- **Detection**: RetinaFace (lightweight variant)
- **Embedding**: ArcFace ResNet-50
- **Input Size**: 320x320 pixels
- **Output**: 512-dimensional L2-normalized embeddings
- **Inference Backend**: ONNX Runtime with CPU optimization

**Performance Characteristics:**
- **Speed**: ~3x faster than Buffalo-L with minimal accuracy loss
- **Detection Threshold**: 0.5 (det_score)
- **Recognition Threshold**: 0.45 (cosine similarity)
- **Optimal Range**: 0.5m - 3m from camera
- **Multi-face**: Supports multiple faces per frame

**Why Buffalo-S?**
- Optimized for real-time wearable applications
- Lower memory footprint (~100MB vs ~300MB for Buffalo-L)
- Faster inference on CPU (50-100ms vs 150-300ms)
- Sufficient accuracy for close-range face recognition
- Better suited for battery-powered devices

### Speech Recognition: Faster Whisper

**Model Architecture:**
- **Base Model**: OpenAI Whisper base.en
- **Backend**: CTranslate2 (optimized C++ inference)
- **Quantization**: INT8 (4x speedup, minimal accuracy loss)
- **Parameters**: ~74M (base model)
- **Languages**: English only (en)

**Performance Characteristics:**
- **Speed**: ~4x faster than original Whisper
- **Latency**: ~100-200ms per chunk
- **Accuracy**: ~95% WER on clean speech
- **Memory**: ~500MB RAM
- **Beam Size**: 1 (greedy decoding for speed)

**Optimizations:**
- VAD filtering reduces unnecessary processing by ~60%
- INT8 quantization provides 3-4x speedup
- Greedy decoding prevents hallucinations
- Condition on previous text disabled for short chunks

**Why Faster Whisper?**
- 4x faster than original Whisper implementation
- Lower memory usage with INT8 quantization
- Better suited for real-time streaming
- CTranslate2 backend optimized for CPU inference
- Maintains high accuracy on conversational speech


### Language Model: Google Gemini 2.5 Flash

**Model Characteristics:**
- **Version**: Gemini 2.5 Flash
- **Context Window**: 1M tokens input, 8K tokens output
- **Latency**: ~1-2 seconds for typical queries
- **Cost**: Optimized for high-volume applications
- **Capabilities**: Multi-turn conversation, RAG, summarization

**Use Cases in MindTrace:**
1. **RAG Query Answering**: Retrieve and synthesize information from interaction history
2. **Summarization**: Generate brief, detailed, or analytical summaries
3. **Insights Generation**: Analyze patterns and provide recommendations
4. **Multi-turn Chat**: Maintain conversation context across multiple turns
5. **Contact Analysis**: Understand relationships and communication patterns

**Prompt Engineering:**
- Strict anti-hallucination instructions
- Plain text output (no markdown) for HUD display
- Context-aware prompts with contact data, stats, and interactions
- Explicit instructions to only use provided data
- Differentiation between "Last Seen" and "Interactions"

**Why Gemini 2.5 Flash?**
- Fast inference for real-time applications
- Large context window for comprehensive RAG
- Cost-effective for high-volume usage
- Strong reasoning capabilities for insights
- Reliable plain text generation

### Embeddings: all-MiniLM-L6-v2

**Model Characteristics:**
- **Architecture**: Sentence Transformer (MiniLM)
- **Dimensions**: 384
- **Max Sequence Length**: 256 tokens
- **Use Case**: Semantic search over conversations

**Performance:**
- **Speed**: ~10ms per sentence on CPU
- **Quality**: High semantic similarity accuracy
- **Size**: ~80MB model file

**Integration:**
- Used by ChromaDB for automatic text embedding
- Powers semantic search across interaction history
- Enables RAG retrieval for AI assistant

---

## Performance Optimization

### Face Recognition Optimizations

1. **Model Selection**: Buffalo-S provides 3x speedup over Buffalo-L
2. **Detection Size**: 320x320 balances speed and accuracy
3. **Warmup**: Models pre-loaded on server startup (zero cold start)
4. **Filtering**: det_score ≥ 0.5 reduces false positives
5. **Batch Processing**: Multiple faces processed in single inference
6. **ONNX Runtime**: Optimized C++ inference engine

### Speech Recognition Optimizations

1. **Faster Whisper**: 4x faster than original Whisper
2. **INT8 Quantization**: 3-4x speedup with minimal accuracy loss
3. **VAD Filtering**: Reduces processing by ~60%
4. **Greedy Decoding**: Beam size 1 for maximum speed
5. **Chunk Size**: 30ms frames for low latency
6. **Transcript Caching**: Smoother output with deque cache

### Database Optimizations

1. **ChromaDB**: HNSW index for fast vector similarity search
2. **PostgreSQL**: Indexed queries on user_id, contact_id, timestamp
3. **Connection Pooling**: SQLAlchemy connection pool
4. **Lazy Loading**: Relationships loaded on-demand
5. **Batch Operations**: Bulk inserts for face embeddings

### Frontend Optimizations

1. **Vite**: Lightning-fast HMR and optimized builds
2. **Code Splitting**: React.lazy for route-based splitting
3. **Image Optimization**: Lazy loading and responsive images
4. **Debouncing**: Search and input debouncing
5. **Memoization**: React.memo for expensive components


---

## Deployment

### Production Considerations

#### Backend Deployment

**Recommended Stack:**
- **Server**: Ubuntu 20.04+ or similar Linux distribution
- **Python**: 3.10-3.12 with uv package manager
- **Database**: PostgreSQL 13+ (managed service recommended)
- **Vector DB**: ChromaDB Cloud or self-hosted with persistent storage
- **Web Server**: Nginx as reverse proxy
- **Process Manager**: systemd or supervisor

**Environment Setup:**
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone and setup
git clone https://github.com/yourusername/mindtrace.git
cd mindtrace/server
uv sync

# Configure production environment
cp .env.example .env
# Edit .env with production values

# Run with systemd
sudo systemctl start mindtrace
```

**Systemd Service Example:**
```ini
[Unit]
Description=MindTrace API Server
After=network.target

[Service]
Type=simple
User=mindtrace
WorkingDirectory=/opt/mindtrace/server
Environment="PATH=/home/mindtrace/.local/bin:/usr/bin"
ExecStart=/home/mindtrace/.local/bin/uv run uvicorn app.app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.mindtrace.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /asr/stream {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Frontend Deployment

**Build for Production:**
```bash
# Dashboard
cd client
npm run build
# Output: dist/

# Glass Client
cd glass-client
npm run build
# Output: dist/
```

**Deployment Options:**
1. **Static Hosting**: Vercel, Netlify, Cloudflare Pages
2. **CDN**: AWS CloudFront, Cloudflare CDN
3. **Self-hosted**: Nginx serving static files

**Nginx Static Hosting:**
```nginx
server {
    listen 80;
    server_name mindtrace.com;
    root /var/www/mindtrace/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```


### Docker Deployment

**Docker Compose Example:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mindtrace
      POSTGRES_USER: mindtrace
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  chromadb:
    image: chromadb/chroma:latest
    environment:
      CHROMA_SERVER_AUTH_CREDENTIALS: ${CHROMA_API_KEY}
    volumes:
      - chroma_data:/chroma/chroma
    ports:
      - "8001:8000"

  api:
    build: ./server
    environment:
      DATABASE_URL: postgresql://mindtrace:${DB_PASSWORD}@postgres:5432/mindtrace
      CHROMA_HOST: chromadb
      CHROMA_PORT: 8000
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - chromadb
    volumes:
      - ./server/data:/app/data

  dashboard:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
  chroma_data:
```

### Security Best Practices

1. **API Keys**: Store in environment variables, never commit to git
2. **JWT Secrets**: Use strong, randomly generated secrets (32+ characters)
3. **HTTPS**: Always use SSL/TLS in production
4. **CORS**: Restrict origins to known domains
5. **Rate Limiting**: Implement rate limiting on API endpoints
6. **Input Validation**: Pydantic models validate all inputs
7. **SQL Injection**: SQLAlchemy ORM prevents SQL injection
8. **File Uploads**: Validate file types and sizes
9. **Authentication**: JWT tokens with expiration
10. **Database**: Use strong passwords and restrict network access

### Monitoring & Logging

**Recommended Tools:**
- **Application Monitoring**: Sentry, DataDog, New Relic
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot, Pingdom

**FastAPI Logging:**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mindtrace.log'),
        logging.StreamHandler()
    ]
)
```


---

## Development

### Setting Up Development Environment

```bash
# Backend development
cd server
uv sync
uv run main.py  # Auto-reload enabled

# Frontend development
cd client
npm install
npm run dev  # HMR enabled

# Glass client development
cd glass-client
npm install
npm run dev
```

### Code Quality

**Backend (Python):**
```bash
# Linting
ruff check .

# Formatting
black .

# Type checking
mypy .
```

**Frontend (JavaScript):**
```bash
# Linting
npm run lint

# Formatting
npx prettier --write .
```

### Testing

**Backend Tests:**
```bash
cd server
pytest tests/
```

**Frontend Tests:**
```bash
cd client
npm test
```

### Database Migrations

**Using Alembic:**
```bash
cd server

# Create migration
alembic revision --autogenerate -m "Add new column"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Adding New Models

1. **Face Recognition**: Replace Buffalo-S in `ai_engine/face_engine.py`
2. **Speech Recognition**: Replace Faster Whisper in `ai_engine/asr/asr_engine.py`
3. **LLM**: Replace Gemini in `ai_engine/rag_engine.py` and `ai_engine/summarizer.py`

### Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

**Contribution Guidelines:**
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described
- Ensure all tests pass before submitting PR


---

## Troubleshooting

### Common Issues

#### Face Recognition Not Working

**Problem**: No faces detected or low accuracy

**Solutions:**
1. Check lighting conditions (face recognition works best in good lighting)
2. Ensure camera is 0.5m - 3m from subject
3. Verify face embeddings are synced: `POST /face/sync`
4. Check ChromaDB connection: `curl http://localhost:8000/health`
5. Lower detection threshold in `face_engine.py` if needed

#### Speech Recognition Slow

**Problem**: High latency or slow transcription

**Solutions:**
1. Ensure Faster Whisper is using INT8 quantization
2. Check CPU usage (should be < 50% per core)
3. Verify VAD is enabled and filtering silence
4. Consider using `tiny.en` model for faster inference
5. Check audio quality (16kHz mono recommended)

#### ChromaDB Connection Failed

**Problem**: Cannot connect to ChromaDB

**Solutions:**
1. Verify ChromaDB is running: `chroma run --host localhost --port 8000`
2. Check environment variables in `.env`
3. Test connection: `curl http://localhost:8000/api/v1/heartbeat`
4. Check firewall settings
5. For cloud ChromaDB, verify API key and tenant/database names

#### Database Migration Errors

**Problem**: Alembic migration fails

**Solutions:**
1. Check database connection string in `.env`
2. Ensure PostgreSQL is running
3. Verify database user has proper permissions
4. Reset migrations: `alembic downgrade base && alembic upgrade head`
5. For SQLite, check file permissions

#### Out of Memory

**Problem**: Server crashes with OOM error

**Solutions:**
1. Reduce batch size for face recognition
2. Use smaller Whisper model (`tiny.en` or `base.en`)
3. Limit ChromaDB query results (`n_results`)
4. Increase server RAM (minimum 4GB recommended)
5. Enable swap space on Linux

#### WebSocket Connection Drops

**Problem**: ASR WebSocket disconnects frequently

**Solutions:**
1. Check network stability
2. Increase WebSocket timeout in Nginx/proxy
3. Verify audio chunk size (30ms recommended)
4. Check server logs for errors
5. Ensure client is sending keep-alive messages


### Performance Benchmarks

**Hardware**: MacBook Pro M1, 16GB RAM

| Operation | Latency | Throughput |
|-----------|---------|------------|
| Face Detection (single face) | 50-100ms | 10-20 FPS |
| Face Recognition (query) | 20-30ms | 30-50 queries/sec |
| ASR Transcription (1s audio) | 100-200ms | 5-10 chunks/sec |
| RAG Query | 1-2s | 0.5-1 queries/sec |
| Summarization | 2-5s | 0.2-0.5 summaries/sec |
| Database Query (indexed) | 5-10ms | 100-200 queries/sec |
| ChromaDB Vector Search | 10-50ms | 20-100 queries/sec |

**Note**: Performance varies based on hardware, model size, and data volume.

---

## Roadmap

### Current Features (v1.0)
- ✅ Real-time face recognition with InsightFace Buffalo-S
- ✅ Live speech-to-text with Faster Whisper
- ✅ Context-aware AI assistant with Gemini 2.5 Flash
- ✅ RAG over interaction history
- ✅ AI summarization and insights
- ✅ Contact management with profile photos
- ✅ Interaction history tracking
- ✅ Emergency SOS system
- ✅ Smart reminders
- ✅ Mobile-responsive dashboard
- ✅ Semantic search

### Planned Features (v1.1)
- 🔄 Multi-language support (Spanish, French, German)
- 🔄 Emotion detection in conversations
- 🔄 Voice cloning for personalized responses
- 🔄 Offline mode with local models
- 🔄 Mobile apps (iOS/Android)
- 🔄 Integration with calendar and email
- 🔄 Advanced analytics dashboard
- 🔄 Export data to PDF reports

### Future Enhancements (v2.0)
- 📋 Real-time object recognition
- 📋 Scene understanding and context
- 📋 Multi-modal AI (vision + audio + text)
- 📋 Predictive reminders based on patterns
- 📋 Social network graph visualization
- 📋 Integration with health monitoring devices
- 📋 Voice commands for hands-free operation
- 📋 Collaborative features for caregivers

---

## FAQ

**Q: What smart glasses are supported?**
A: MindTrace is designed for Ray-Ban Meta smart glasses but can work with any device that has a camera, microphone, and can run a web browser.

**Q: Can I use this without smart glasses?**
A: Yes! You can use the dashboard and upload photos/audio manually. The glass client is optional.

**Q: Is my data private?**
A: Yes. All data is stored locally or in your own database. Face embeddings and conversations never leave your server unless you use cloud services (Gemini API, ChromaDB Cloud).

**Q: Can I use different AI models?**
A: Yes! The system is modular. You can replace Gemini with OpenAI, Anthropic, or local models. See "Adding New Models" in the Development section.

**Q: What's the minimum hardware requirement?**
A: Server: 4GB RAM, 2 CPU cores, 10GB storage. Client: Any modern browser. Smart glasses: Ray-Ban Meta or similar.

**Q: Does this work offline?**
A: Partially. Face recognition and speech-to-text work offline, but the AI assistant requires internet for Gemini API. Offline mode with local LLMs is planned for v1.1.

**Q: How accurate is the face recognition?**
A: ~95% accuracy at 0.5-3m range in good lighting. Accuracy decreases with poor lighting, extreme angles, or occlusions.

**Q: Can I use this for commercial purposes?**
A: Yes, under the MIT license. However, check the licenses of individual models (InsightFace, Whisper, etc.) for commercial use restrictions.


---

## Acknowledgments

### Open Source Projects

- **[InsightFace](https://github.com/deepinsight/insightface)** - State-of-the-art face recognition models
- **[Faster Whisper](https://github.com/SYSTRAN/faster-whisper)** - Optimized Whisper implementation
- **[OpenAI Whisper](https://github.com/openai/whisper)** - Robust speech recognition
- **[Google Gemini](https://ai.google.dev/)** - Powerful language model
- **[ChromaDB](https://www.trychroma.com/)** - Vector database for embeddings
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[React](https://react.dev/)** - UI library
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[LangChain](https://www.langchain.com/)** - LLM application framework
- **[PyTorch](https://pytorch.org/)** - Deep learning framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** - SQL toolkit and ORM

### Research Papers

- **ArcFace**: Deng, J., et al. (2019). "ArcFace: Additive Angular Margin Loss for Deep Face Recognition"
- **RetinaFace**: Deng, J., et al. (2020). "RetinaFace: Single-Shot Multi-Level Face Localisation in the Wild"
- **Whisper**: Radford, A., et al. (2022). "Robust Speech Recognition via Large-Scale Weak Supervision"
- **Sentence Transformers**: Reimers, N., & Gurevych, I. (2019). "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks"

### Contributors

Thank you to all contributors who have helped make MindTrace better!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **InsightFace**: Apache 2.0 License (non-commercial use recommended)
- **Whisper**: MIT License
- **FastAPI**: MIT License
- **React**: MIT License
- **Tailwind CSS**: MIT License
- **ChromaDB**: Apache 2.0 License
- **PyTorch**: BSD-style License

**Note**: Some models (InsightFace) have restrictions on commercial use. Please review individual licenses before deploying commercially.

---

## Support

### Getting Help

- **Documentation**: This README and inline code comments
- **Issues**: [GitHub Issues](https://github.com/yourusername/mindtrace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mindtrace/discussions)
- **Email**: support@mindtrace.com (if applicable)

### Reporting Bugs

When reporting bugs, please include:
1. Operating system and version
2. Python version
3. Node.js version
4. Steps to reproduce
5. Expected vs actual behavior
6. Error messages and logs
7. Screenshots (if applicable)

### Feature Requests

We welcome feature requests! Please:
1. Check existing issues first
2. Describe the feature and use case
3. Explain why it would be valuable
4. Provide examples if possible

---

## Citation

If you use MindTrace in your research or project, please cite:

```bibtex
@software{mindtrace2024,
  title = {MindTrace: AI-Powered Memory Assistant for Smart Glasses},
  author = {Your Name},
  year = {2024},
  url = {https://github.com/yourusername/mindtrace}
}
```

---

## Contact

**Project Maintainer**: Your Name

**Email**: your.email@example.com

**GitHub**: [@yourusername](https://github.com/yourusername)

**Website**: https://mindtrace.com (if applicable)

---

<div align="center">

**Built with ❤️ for people who need a little help remembering**

[⬆ Back to Top](#mindtrace)

</div>
