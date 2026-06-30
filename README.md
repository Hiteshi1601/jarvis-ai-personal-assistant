# JARVIS AI - Personal Google Productivity Assistant

JARVIS AI is a premium, cinematic, full-stack AI Assistant designed to automate your Google Workspace ecosystem (Gmail, Calendar, Sheets, Drive, Docs) using the Groq API, secure Google OAuth 2.0, and a persistent PostgreSQL database memory store.

The interface is inspired by high-end design languages such as Apple Vision Pro, Tesla, Linear, and Raycast, combining a dark futuristic look with glowing cyan/purple indicators, glassmorphic cards, and dynamic voice/thinking wave indicators.

---

## Technical Stack

- **LLM Agent Orchestrator:** Groq API (`llama-3.3-70b-versatile` model) with multi-turn tool calling.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** PostgreSQL with Prisma ORM.
- **Authentication:** Google OAuth 2.0 client flow, session management via secure HttpOnly JWT cookies.
- **APIs:** Google Gmail, Google Calendar, Google Sheets, Google Drive, Google Docs APIs.

---

## Directory Structure

```
jarvis-ai/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── middleware/      # Authentication cookie checking
│   │   ├── services/        # Google Workspace integrations
│   │   ├── agents/          # Coordinator tool execution loop
│   │   └── index.ts         # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL Prisma models
│   ├── .env.template
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile           # Production container build
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
- Google Cloud Platform (GCP) credentials with access to Workspace APIs.
- [Groq API Key](https://console.groq.com/) for Llama-3.3-70b access.

### 2. Environment Configurations

#### Backend (`backend/.env`)
Create a `.env` file in the `backend` folder:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://neondb_owner:npg_ekadGO9IS3ZU@ep-floral-credit-atg7pj89-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"

GROQ_API_KEY="your-groq-api-key"
JWT_SECRET="your-jwt-signing-secret"
ENCRYPTION_KEY="your-64-character-hex-aes-key"
```

#### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend` folder:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

---

## Production Deployment Guide

Since we are a local assistant, we cannot run third-party cloud logins directly. However, the codebase is fully ready for deployment. Follow these quick steps to deploy:

### 1. Deploy the Backend to Render or Railway
The backend includes a production [Dockerfile](file:///C:/Users/DELL/.gemini/antigravity/scratch/jarvis-ai/backend/Dockerfile).

#### Via Render (Docker):
1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository.
3. Select **Docker** as the Runtime environment.
4. Add the following environment variables in the Render console:
   * `DATABASE_URL` (your production PostgreSQL link)
   * `GROQ_API_KEY` (your Groq key)
   * `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   * `GOOGLE_REDIRECT_URI` (must match your frontend domain + `/oauth2callback`, e.g. `https://your-app.vercel.app/oauth2callback`)
   * `JWT_SECRET` & `ENCRYPTION_KEY`
   * `FRONTEND_URL` (your frontend deployment URL)

### 2. Deploy the Frontend to Vercel
The frontend is natively optimized for Vercel.

1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select your repository and set the **Root Directory** to `frontend`.
3. Add the environment variable:
   * `NEXT_PUBLIC_API_URL` (the backend URL you deployed in Step 1)
4. Click **Deploy**.

*Ensure that you update the `GOOGLE_REDIRECT_URI` inside your Google Cloud Console to point to your new production frontend callback path!*
