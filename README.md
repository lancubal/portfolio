# Secure Cloud Shell Portfolio

A high-fidelity remote code execution (RCE) portfolio capable of spawning persistent, isolated Linux shells for visitors.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Prototype-orange.svg)

## 🏗 Architecture

This project moves beyond simple "stateless" script execution by implementing a **Stateful Cloud Shell** architecture. It behaves like a VPS provider (e.g., EC2, DigitalOcean) but for temporary, sandboxed sessions.

### Core Components

1.  **Frontend (Next.js 14 + Tailwind):**
    *   Provides a retro-styled, interactive terminal interface.
    *   Maintains a persistent connection logic with the backend.
    
2.  **Backend (Node.js + Express):**
    *   **Session Manager:** Orchestrates the lifecycle of Docker containers.
    *   **Garbage Collector:** A background process that monitors activity and kills abandoned containers (default timeout: 10 minutes) to prevent resource exhaustion.
    
3.  **Execution Engine (Docker + Alpine Linux):**
    *   **Persistence:** Containers are started with `sleep infinity` to maintain state (filesystem changes, variables) throughout the user's session.
    *   **Isolation:** Strict resource limits (CPU, RAM) and network policies (coming soon).

### System Flow

1.  **Handshake:** User lands on the site -> Backend spawns a dedicated Docker container -> Returns `SessionID`.
2.  **Interaction:** User types `touch hello.txt` -> Backend executes `docker exec <container_id> touch hello.txt`.
3.  **Persistence:** User types `ls` -> Backend executes `docker exec...` -> Returns `hello.txt`.
4.  **Cleanup:** If the user leaves, the Garbage Collector detects inactivity and forcefully removes the container (`docker stop`).

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18+)
*   **Docker Desktop** (Must be running)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lancubal/portfolio.git
    cd portfolio
    ```

2.  **Install dependencies:**
    ```bash
    # Install Server dependencies
    cd server
    npm install

    # Install Client dependencies
    cd ../client
    npm install
    ```

### Running Locally

You need two terminal windows:

**Terminal 1 (Backend):**
```bash
cd server
node index.js
# Output: Server listening at http://localhost:3001
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
# Output: Ready in 3000
```

Open [http://localhost:3000](http://localhost:3000) to access your Cloud Shell.

## 🛠 Tech Stack

*   **Frontend:** TypeScript, Next.js (App Router), Tailwind CSS.
*   **Backend:** Node.js, Express.js, `child_process`, `uuid`.
*   **Infra:** Docker Engine, Alpine Linux Images.

## 🔮 Roadmap

- [x] Local Development Environment
- [x] Docker Container Orchestration
- [x] **Stateful Sessions** (Persistence)
- [x] Automatic Garbage Collection
- [ ] AWS EC2 Deployment
- [ ] Nginx Reverse Proxy & SSL
- [ ] Network Security Hardening (`--network none`)
