# 🚀 CodeCollab — Real-time Collaborative Code Editor with AI Assistance

CodeCollab is a web-based tool that enables developers, interviewers, and teams to collaborate on code in real-time. Featuring live code sharing, AI-powered assistance, chat, whiteboarding, and instant execution.

---

## 📸 CodeCollab Preview

<img src="https://raw.githubusercontent.com/AdityaGowda23/CodeCollab-AI/main/client/public/Screenshot%202025-08-09%20000318.png" width="45%" />
<img src="https://raw.githubusercontent.com/AdityaGowda23/CodeCollab-AI/main/client/public/Screenshot%202025-08-09%20000339.png" width="45%" />

---

## ✨ Features

### 🧑‍💻 Real-Time Collaboration
- Multiple participants can edit the same file simultaneously.
- See collaborators' cursors and changes in real-time.
- Built using **Monaco Editor**, **Yjs**, and **WebRTC**.

### 🤖 AI Coding Copilot
- Powered by **GitHub Models API** and **Google Gemini**.
- Context-aware suggestions: Analyze, Debug, Optimize, Complete, Explain.

### 🧠 Whiteboard Integration
- Collaborative drawing canvas with **tldraw**.

### ⚙️ Code Execution Engine
- JavaScript runs in-browser; Python, Java, and C++ via **Piston API**.

### 🔗 Shareable Room Links
- One-click room creation with public URLs.

---

## 🏗️ Architecture

The app runs as **three separate processes**:

| Service | Folder | Port | Purpose |
|---------|--------|------|---------|
| **API server** | `server/` | 3000 | REST API, AI proxy, users, interviews |
| **Socket server** | `server2.js/` | 5000 | Chat, WebRTC signaling (Socket.IO) |
| **Frontend** | `client/` | 5173 | React + Vite UI |

**Stack:** React, Monaco, Yjs, Liveblocks, Express, Socket.IO, GitHub Models API, Firebase Auth, MongoDB.

---

## ⚙️ Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/AdityaGowda23/CodeCollab-AI.git
cd CodeCollab-AI
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
cd ../server2.js && npm install
```

### 3. Configure environment variables

Copy the example files and edit them:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

```env
GITHUB_TOKEN=ghp_your_github_token
AI_ENABLED=true
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | For AI | GitHub token with Models API access |
| `AI_ENABLED` | No | Set to `true` to enable the AI copilot |
| `PISTON_API_KEY` | For Python/Java/C++ | Bearer token for public Piston API (whitelist since Feb 2026) |
| `PISTON_API_URL` | No | Piston execute URL (default: emkc.org; self-host: `http://localhost:2000/api/v2/execute`) |
| `MONGODB_URI` | For auth/interviews | MongoDB Atlas connection string |
| `PORT` | No | API port (default `3000`) |

**`client/.env`**

```env
VITE_API_BASE_URL=http://localhost:3000
```

> Firebase and Liveblocks keys are already configured in the client source for local development.

### 4. Run the application

Open **three terminals** from the project root:

```bash
# Terminal 1 — API server (port 3000)
cd server
npm run dev

# Terminal 2 — Socket server (port 5000)
cd server2.js
npm run dev

# Terminal 3 — Frontend (port 5173)
cd client
npm run dev
```

Production-style start (no file watching):

```bash
cd server && npm start
cd server2.js && npm start
cd client && npm run dev
```

### 5. Open the app

Visit **[http://localhost:5173](http://localhost:5173)**

### Health checks

| Service | URL |
|---------|-----|
| API | http://localhost:3000/api/ai/health |
| Socket | http://localhost:5000/health |
| Client | http://localhost:5173 |

---

## 💡 Usage Guide

1. **Create or join a room** — Use “Create New Room” or open `/room/:roomId`.
2. **Collaborate** — Edit code, chat, and use the whiteboard with your team.
3. **AI copilot** — Click the 🤖 button (requires `GITHUB_TOKEN` + `AI_ENABLED=true` in `server/.env`, then **restart** the server).
4. **Run code** — JavaScript runs in the browser; other languages use the server Piston proxy (`PISTON_API_KEY` or a self-hosted Piston instance).
5. **Share** — Copy the room URL to invite others.

### Useful routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/auth` | Firebase login |
| `/editor/` | Collaborative editor |
| `/room/:roomId` | Interview room (chat + video) |
| `/dashboard` | User dashboard (logged in) |

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
# make changes, commit, push
gh pr create
```

---

## 🧾 License

MIT License — see [LICENSE](LICENSE).

---

> Built with ❤️ for developers, by developers.
