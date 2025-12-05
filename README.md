# 🧠 MindTrace

> **Your external memory, whispering context when you need it most.**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](http://makeapullrequest.com)

<!-- 
📸 SCREENSHOT/GIF NEEDED
Add a hero image or demo GIF showing the face recognition HUD in action.
Recommended: Screen recording of the glass-client showing real-time face recognition with name overlays.
Tools: Use OBS, Loom, or asciinema for recordings. Convert to GIF with gifski.
Place in: ./assets/demo.gif
-->

![MindTrace Demo](./assets/demo.gif)

---

## ✨ What is MindTrace?

MindTrace is an **AI-powered memory assistant** designed to work seamlessly with Ray-Ban Meta smart glasses. It helps users—especially those who may struggle with memory—by:

- 👁️ **Recognizing faces** in real-time and whispering names into your ear
- 🎤 **Transcribing conversations** live via speech-to-text
- 🤖 **Providing an AI assistant** that knows your contacts, reminders, and history
- 🚨 **Emergency SOS features** with real-time location sharing
- ⏰ **Smart reminders** for medications, meals, and activities

---

## 📋 Table of Contents

- [✨ What is MindTrace?](#-what-is-mindtrace)
- [🎯 Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Configuration](#-configuration)
- [🏗️ Architecture](#️-architecture)
- [📖 Usage](#-usage)
- [🛠️ Development](#️-development)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

---

## 🎯 Key Features

### 👁️ Real-Time Face Recognition
Powered by **InsightFace** with RetinaFace detection and ArcFace embeddings. Instantly identifies people from your contact database and displays their name, relationship, and context.

### 🎙️ Live Speech-to-Text
Uses **OpenAI Whisper** for accurate transcription. Conversations are streamed via WebSocket, providing real-time subtitles overlaid on the smart glasses view.

### 🤖 Context-Aware AI Assistant
Integrated with **Google Gemini** AI that has full context of your:
- Contacts and relationships
- Reminders and schedules
- Recent interactions and conversations
- Emergency contacts

### 🚨 Emergency SOS System
One-button emergency activation with:
- Real-time GPS location sharing
- Automatic alerts to emergency contacts
- Configurable SMS/call preferences
- SOS alert history and management

### 📊 Comprehensive Dashboard
Web-based dashboard for caregivers and users to:
- Manage contacts with face photo enrollment
- Review interaction history and conversation summaries
- Configure medication and activity reminders
- Monitor alerts and system status

### 🔒 Privacy-First Design
- All face embeddings stored locally
- End-to-end encryption for sensitive data
- No cloud storage of biometric data

---

## 🚀 Quick Start

Get MindTrace running in under 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/mindtrace.git
cd mindtrace

# 2. Start the server
cd server
uv sync && uv run main.py

# 3. Start the dashboard (new terminal)
cd client
npm install && npm run dev

# 4. Open http://localhost:5173 in your browser
```

That's it! The server runs at `http://localhost:8000`, and the dashboard at `http://localhost:5173`.

---

## 📦 Installation

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v18+ | Client applications |
| **Python** | 3.10-3.12 | Backend server |
| **uv** | Latest | Python package management |
| **PostgreSQL** | 13+ | Database (optional, SQLite default) |

#### Installing uv (Python Package Manager)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mindtrace.git
cd mindtrace
```

#### 2. Server Setup

```bash
cd server

# Install dependencies with uv
uv sync

# Or using pip (alternative)
pip install -r requirements.txt

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

#### 3. Dashboard Client Setup

```bash
cd client
npm install
```

#### 4. Smart Glasses Client Setup (Optional)

```bash
cd glass-client
npm install
```

### Verify Installation

```bash
# Test server
cd server && uv run main.py
# Should output: Uvicorn running on http://127.0.0.1:8000

# Test client (new terminal)
cd client && npm run dev
# Should output: Local: http://localhost:5173
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` files in both `client/` and `server/` directories.

#### Server (`server/.env`)

```env
# Required
PORT=8000
CLIENT_URL=http://localhost:5173
GLASS_URL=http://localhost:5174
SECRET_KEY=your-secret-key-here

# AI Features (Required for chat)
GEMINI_API_KEY=your-gemini-api-key

# Hugging Face (Optional - for model downloads)
HF_TOKEN=your-huggingface-token

# Database (Optional - defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/mindtrace
```

#### Dashboard Client (`client/.env`)

```env
VITE_BASE_URL=http://localhost:8000
```

#### Glasses Client (`glass-client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `SECRET_KEY` | Required | JWT signing key |
| `GEMINI_API_KEY` | Required | Google Gemini API key for AI chat |
| `DATABASE_URL` | SQLite | PostgreSQL connection string |

---

## 🏗️ Architecture

```
mindtrace/
├── server/                 # FastAPI Backend
│   ├── main.py            # Application entry point
│   ├── app/
│   │   ├── app.py         # FastAPI app configuration
│   │   ├── models.py      # SQLAlchemy database models
│   │   ├── routes/        # API endpoints
│   │   │   ├── authRoutes.py      # Authentication (JWT + OAuth)
│   │   │   ├── faceRoutes.py      # Face recognition API
│   │   │   ├── contactRoutes.py   # Contact management
│   │   │   ├── chatRoutes.py      # AI chat (Gemini)
│   │   │   ├── sosRoutes.py       # Emergency SOS
│   │   │   └── ...
│   │   └── services/      # Business logic
│   │       └── ai_service.py      # Gemini AI integration
│   └── ai_engine/         # ML Models
│       ├── face_engine.py # InsightFace integration
│       └── asr/           # Whisper speech-to-text
│           ├── asr_engine.py
│           └── vad_engine.py
│
├── client/                 # Dashboard (React + Vite)
│   └── src/
│       ├── pages/         # Route pages
│       │   ├── DashboardHome.jsx
│       │   ├── ContactsDirectory.jsx
│       │   ├── Reminders.jsx
│       │   ├── SOSSettings.jsx
│       │   └── ...
│       └── components/    # Reusable components
│
└── glass-client/          # Smart Glasses HUD (React + Vite)
    └── src/
        ├── pages/
        │   └── FaceRecognition.jsx
        └── components/
            └── HUDOverlay.jsx
```

### System Flow

```mermaid
graph LR
    A[Smart Glasses Camera] --> B[glass-client]
    B --> |Frame Upload| C[FastAPI Server]
    C --> D[InsightFace Engine]
    D --> |Face Embeddings| C
    C --> |Recognition Result| B
    
    A --> |Audio Stream| E[Whisper ASR]
    E --> |Transcription| B
    
    F[Dashboard Client] --> C
    C --> G[(PostgreSQL)]
    C --> H[Gemini AI]
```

---

## 📖 Usage

### Dashboard Features

#### Managing Contacts

1. Navigate to **Contacts Directory** (`/dashboard/contacts`)
2. Click **Add Contact** to create a new entry
3. Upload a profile photo for face recognition
4. Click **Sync Faces** to update the recognition database

#### Setting Up Reminders

1. Go to **Reminders** (`/dashboard/reminders`)
2. Create medication, meal, or activity reminders
3. Set time and recurrence (daily, weekly, weekdays)
4. Enable smart alerts for automated notifications

#### Configuring SOS

1. Access **SOS Settings** (`/dashboard/sos`)
2. Add emergency contacts with priority levels
3. Configure alert preferences (SMS, calls, email)
4. Test the SOS system from the alerts page

### Smart Glasses HUD

The `glass-client` provides a real-time heads-up display:

1. Start the glass client: `cd glass-client && npm run dev`
2. Open `http://localhost:5174` in a browser
3. Allow camera and microphone access
4. Faces will be detected and labeled in real-time
5. Live speech transcription appears as subtitles

### AI Assistant

Chat with the MindTrace AI from the dashboard:

- Ask about your contacts: *"Who is my daughter?"*
- Get reminders: *"What medications do I have today?"*
- Navigate features: *"How do I add an emergency contact?"*

---

## 🛠️ Development

### Available Scripts

#### Server

```bash
cd server

# Start development server with hot reload
uv run main.py

# Sync face embeddings from database
uv run sync_faces.py

# Verify ASR engine
uv run verify_asr.py
```

#### Client

```bash
cd client

npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

#### Glass Client

```bash
cd glass-client

npm run dev      # Start development server
npm run build    # Build for production
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/face/recognize` | POST | Upload frame for face recognition |
| `/contacts` | GET/POST | Manage contacts |
| `/reminders` | GET/POST | Manage reminders |
| `/chat/stream` | POST | Stream AI chat response |
| `/sos/alerts` | GET/POST | SOS alert management |
| `/asr/{profile_id}` | WebSocket | Real-time speech transcription |

### Testing Face Recognition

```bash
# After adding contacts with photos in the dashboard
cd server
uv run sync_faces.py  # Sync embeddings

# The face engine will now recognize enrolled faces
```

---

## 🗺️ Roadmap

<!-- 
🎯 CUSTOMIZE: Add your planned features here
-->

- [ ] Voice command activation ("Hey MindTrace")
- [ ] Multi-language ASR support
- [ ] Offline face recognition
- [ ] Apple Watch / WearOS companion app
- [ ] Integration with health tracking devices

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **JavaScript/React**: ESLint configuration included
- **Commits**: Use conventional commit messages

---

## 📝 License

<!-- 
📋 LICENSE NEEDED
Add a LICENSE file to the repository root.
Recommended: MIT License for open source projects.
-->

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [InsightFace](https://github.com/deepinsight/insightface) for face recognition
- [OpenAI Whisper](https://github.com/openai/whisper) for speech-to-text
- [Google Gemini](https://ai.google.dev/) for AI assistance
- [Ray-Ban Meta](https://www.meta.com/smart-glasses/) for smart glasses platform inspiration

---

<p align="center">
  <sub>Built with ❤️ for those who need a little help remembering</sub>
</p>

<p align="center">
  <a href="#-mindtrace">⬆ Back to Top</a>
</p>

<!-- 
⭐ If you find MindTrace helpful, please consider giving it a star!
It helps others discover this project and motivates continued development.
-->
