import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load variables from .env
dotenv.config();

import { requireAuth, AuthenticatedRequest } from './middleware/auth.middleware';
import { getAuthUrl, handleOAuthCallback, getOAuth2ClientForUser } from './services/oauth.service';
import { AgentCoordinator } from './agents/coordinator';
import prisma from './config/db';

// Service API lookups
import { listEmails } from './services/gmail.service';
import { listEvents } from './services/calendar.service';

// Initialize Groq Client
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Diagnose environment variables
app.get('/api/diagnose', (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL || 'Not Set',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'Not Set',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 'Not Set',
    HAS_DATABASE: !!process.env.DATABASE_URL,
    HAS_GROQ: !!process.env.GROQ_API_KEY,
    HAS_GOOGLE_CLIENT: !!process.env.GOOGLE_CLIENT_ID
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

/**
 * Step 1: Redirect to Google consent screen
 */
app.get('/api/auth/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  } catch (err: any) {
    console.error('Error generating Google Auth URL:', err);
    res.status(500).json({ error: 'Failed to start Google OAuth process.' });
  }
});

/**
 * Step 2: Handle Google Redirect callback
 */
app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth-error?reason=no_code`);
  }

  try {
    // Exchange code for tokens and fetch user info
    const { userId, email, name } = await handleOAuthCallback(code);

    // Sign JWT
    const sessionToken = jwt.sign(
      { userId, email, name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect user back to Next.js frontend
    res.redirect(`${FRONTEND_URL}/`);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    res.redirect(`${FRONTEND_URL}/auth-error?reason=callback_failed`);
  }
});

/**
 * Check Auth Status
 */
app.get('/api/auth/status', (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return res.json({
      authenticated: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name
      }
    });
  } catch (err) {
    return res.json({ authenticated: false });
  }
});

/**
 * Log user out (clear session cookie)
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ==========================================
// AGENT / WORKSPACE ROUTES
// ==========================================

/**
 * Core AI agent chat endpoint
 */
app.post('/api/agent/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { message, history } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User context not found' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const coordinator = new AgentCoordinator(userId);
    const result = await coordinator.chat(message, history || []);
    res.json(result);
  } catch (err: any) {
    console.error('Agent chat endpoint error:', err);
    res.status(500).json({
      error: 'An internal error occurred in the JARVIS Coordinator agent.',
      details: err.message
    });
  }
});

/**
 * Aggregate data for dashboard widgets (Meetings, emails, tasks, AI advice)
 */
app.get('/api/workspace/dashboard-data', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User context not found' });
  }

  let googleConnected = false;
  let meetings: any[] = [];
  let emails: any[] = [];
  let tasks: any[] = [];
  let aiRecommendations: string[] = [];

  try {
    // 1. Fetch local tasks
    tasks = await prisma.task.findMany({
      where: { userId, completed: false },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 2. Fetch Google Client
    let oauth2Client;
    try {
      oauth2Client = await getOAuth2ClientForUser(userId);
      googleConnected = true;
    } catch (e) {
      googleConnected = false;
    }

    if (googleConnected && oauth2Client) {
      // 3. Fetch calendar meetings (today's schedule)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      try {
        meetings = await listEvents(oauth2Client, startOfDay.toISOString(), endOfDay.toISOString(), 5);
      } catch (calErr) {
        console.error('Error fetching calendar in dashboard aggregation:', calErr);
      }

      // 4. Fetch emails (recent primary emails)
      try {
        emails = await listEmails(oauth2Client, 'is:unread category:primary', 3);
      } catch (gmailErr) {
        console.error('Error fetching emails in dashboard aggregation:', gmailErr);
      }

      // 5. Generate AI Recommendations (mini-run with Groq)
      if (GROQ_API_KEY) {
        try {
          const groq = new Groq({ apiKey: GROQ_API_KEY });
          const prompt = `You are JARVIS. Analyze the following dashboard data for user "${req.user?.name}".
Output exactly 3 short bullet points of actionable recommendation or insights. Keep each under 10 words. Avoid fluff.
Today's Meetings: ${JSON.stringify(meetings.map(m => m.summary))}
Unread Emails: ${JSON.stringify(emails.map(e => ({ subject: e.subject, from: e.from })))}
Pending Tasks: ${JSON.stringify(tasks.map(t => t.title))}
Output formatted as a JSON string array. Example: ["Review the quarterly budget sheet", "Reply to Bob's urgent meeting request", "Schedule prep for the demo session"]`;

          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const rawText = completion.choices[0]?.message?.content || '[]';
          // Find array bounds to parse JSON safely
          const startIdx = rawText.indexOf('[');
          const endIdx = rawText.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1) {
            const jsonText = rawText.substring(startIdx, endIdx + 1);
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed)) {
              aiRecommendations = parsed.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                  return (item as any).recommendation || (item as any).text || (item as any).insight || JSON.stringify(item);
                }
                return String(item);
              });
            } else {
              aiRecommendations = ["Stay productive today!", "Double check your email replies", "Keep your calendar organized"];
            }
          } else {
            aiRecommendations = ["Stay productive today!", "Double check your email replies", "Keep your calendar organized"];
          }
        } catch (aiErr) {
          console.error('Error generating recommendations:', aiErr);
          aiRecommendations = ["Keep calendar updated", "Follow up on recent emails", "Review pending tasks"];
        }
      }
    } else {
      aiRecommendations = ["Connect your Google Account to unlock JARVIS automation capabilities."];
    }

    res.json({
      googleConnected,
      meetings,
      emails,
      tasks,
      aiRecommendations
    });
  } catch (err: any) {
    console.error('Dashboard data endpoint error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard aggregated information' });
  }
});

// ==========================================
// TASK MANAGEMENT CRUD
// ==========================================

/**
 * Create a new checklist task
 */
app.post('/api/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { title, priority, dueDate } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: 'Missing title or user context' });
  }

  try {
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * Toggle task completion status
 */
app.patch('/api/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { completed }
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task completion' });
  }
});

// ==========================================
// MEMORY SYSTEM MANAGEMENT
// ==========================================

/**
 * Get all user memories/preferences
 */
app.get('/api/memories', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User context not found' });
  }

  try {
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { key: 'asc' }
    });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

/**
 * Delete a user memory by ID
 */
app.delete('/api/memories/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    await prisma.memory.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
// Health check route for Vercel testing
app.get("/", (req, res) => {
  res.json({
    message: "🚀 JARVIS AI Backend is running",
    status: "success"
  });
});


// Local development server only
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 5000;

//   app.listen(PORT, () => {
//     console.log(
//       `🚀 JARVIS AI Backend Server running on http://localhost:${PORT}`
//     );
//   });
// }
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Export Express app for Vercel
export default app;