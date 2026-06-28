import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';

export const metadata: Metadata = {
  title: 'JARVIS AI - Personal Google Productivity Assistant',
  description: 'Automate your Google Workspace calendar, emails, documents, and sheets using Gemini agentic command tools.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="cyber-grid min-h-screen bg-cyber-bg antialiased selection:bg-cyber-blue/30 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
