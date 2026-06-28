# JARVIS AI - Personal Google Productivity Assistant

JARVIS AI is a premium, cinematic, full-stack AI Assistant designed to automate your Google Workspace ecosystem (Gmail, Calendar, Sheets, Drive, Docs) using the Gemini API, secure Google OAuth 2.0, and a persistent PostgreSQL database memory store.

The interface is inspired by high-end design languages such as Apple Vision Pro, Tesla, Linear, and Raycast, combining a dark futuristic look with glowing cyan/purple indicators, glassmorphic cards, and dynamic voice/thinking wave indicators.

---

## Technical Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** PostgreSQL with Prisma ORM.
- **Authentication:** Google OAuth 2.0 client flow, session management via secure HttpOnly JWT cookies.
- **AI Orchestration:** Gemini API (`gemini-1.5-flash` model) utilizing multi-step Function Calling (Tool Calling) loops.
- **APIs:** Google Gmail, Google Calendar, Google Sheets, Google Drive, Google Docs APIs.

---

## Directory Structure

```
jarvis-ai/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── controllers/     # API request controllers
│   │   ├── middleware/      # Authentication cookie checking
│   │   ├── services/        # Google Workspace integrations
│   │   ├── agents/          # Coordinator tool execution loop
│   │   └── index.ts         # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL Prisma models
│   ├── .env.template
│   ├── package.json
│   ├── tsconfig.json
│   └── docker-compose.yml   # Local PostgreSQL Docker runner
├── frontend/
│   ├── src/
│   │   ├── app/             # Main layout, router, global CSS
│   │   ├── components/      # Glassmorphism Sidebar, Chat, Widgets
│   │   └── contexts/        # Auth cookie hook context
│   ├── .env.template
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── package.json             # Workspace helper scripts
└── README.md
```

---

## Setup & Running Guide

### 1. Requirements

- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Compose](https://www.docker.com/) (to run local PostgreSQL database)
- Google Cloud Platform (GCP) credentials with access to:
  - Gmail API
  - Google Calendar API
  - Google Sheets API
  - Google Drive API
  - Google Docs API
- [Google AI Studio API Key](https://aistudio.google.com/) for Gemini access.

### 2. Environment Configurations

#### Backend (`backend/.env`)
Create a `.env` file in the `backend` folder and populate it based on `backend/.env.template`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:jarvispassword@localhost:5432/jarvis_db?schema=public"

GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"

GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="your-jwt-signing-secret"
ENCRYPTION_KEY="your-64-character-hex-aes-key"
```

#### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend` folder and populate it based on `frontend/.env.template`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

### 3. Installation and Setup Steps

In the project's root folder `jarvis-ai`, open your terminal and run:

```bash
# 1. Install all dependencies for both frontend and backend
npm run install:all

# 2. Spin up the PostgreSQL Docker container
npm run db:start

# 3. Generate Prisma client libraries
npm run prisma:generate

# 4. Deploy schema migrations to PostgreSQL
npm run prisma:migrate
```

### 4. Running the Development Servers

Open two terminal windows (or split terminal) in the root `jarvis-ai` folder:

**Terminal 1:** Run the Express Backend
```bash
npm run dev:backend
```

**Terminal 2:** Run the Next.js Frontend
```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Agent Capability Examples

In the central AI chat dashboard panel, you can type commands like:

- **Gmail:**
  - *"Show my urgent unread emails."*
  - *"Reply professionally to the last email from Bob saying I will attend the sync tomorrow."*
  - *"Summarize recent messages from HR."*
- **Calendar:**
  - *"Schedule a project sync tomorrow at 2:00 PM for 1 hour."*
  - *"Am I free next Monday between 10 AM and 11:30 AM?"*
  - *"Cancel my meeting with Dave."*
- **Sheets:**
  - *"Create a spreadsheet named Monthly Expenses."*
  - *"Read the data in spreadsheet ID [id] range Sheet1!A1:B10."*
- **Local Tasks checklist:**
  - *"Add a task to buy groceries."*
  - *"Check off task ID [id] as completed."*
