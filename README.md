# MindTrace

## Tech Stack

### Client
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **State/Effects**: GSAP, Lenis
- **HTTP Client**: Axios

### Server
- **Language**: Python 3.10+
- **Framework**: FastAPI
- **Package Manager**: uv
- **Server**: Uvicorn

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18+ recommended) & **npm**
- **Python** (v3.13+)
- **uv** (Python package manager) - [Installation Guide](https://docs.astral.sh/uv/getting-started/installation/)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MindTrace
```

### 2. Client Setup

Navigate to the client directory and install dependencies:

```bash
cd client
npm install
```

### 3. Server Setup

Navigate to the server directory and sync dependencies using `uv`:

```bash
cd ../server
uv pip install -r requirements.txt
uv sync
```

To activate the virtual environment:

**Mac/Linux:**
```bash
source .venv/bin/activate
```

**Windows:**
```bash
.venv\Scripts\activate
```

*Note: If you prefer `pip`, you can install dependencies from `requirements.txt`, but `uv` is recommended for this project.*

## Environment Variables

You need to set up environment variables for both the client and the server.

### Client (`client/.env`)

Create a `.env` file in the `client` directory:

```env
VITE_BASE_URL=http://localhost:8000
```

### Server (`server/.env`)

Create a `.env` file in the `server` directory:

```env
PORT=8000
CLIENT_URL=http://localhost:5173
HF_TOKEN=****
```

## Running the Project

### Start the Server

In the `server` directory:

```bash
uv run main.py
```
The server will start at `http://localhost:8000`.

### Start the Client

In the `client` directory:

```bash
npm run dev
```
The client will start at `http://localhost:5173`.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.
