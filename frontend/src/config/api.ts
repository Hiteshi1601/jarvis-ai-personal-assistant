export function getCleanApiUrl(): string {
  let rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').trim();
  
  const matches = rawUrl.match(/https?:\/\/[^\s"'<>]+/g);
  if (matches && matches.length > 0) {
    const renderMatch = [...matches].reverse().find(m => m.includes('onrender.com'));
    if (renderMatch) {
      rawUrl = renderMatch;
    } else {
      rawUrl = matches[0];
    }
  }

  // Strip trailing slashes or mangled concatenation fragments
  rawUrl = rawUrl.replace(/\/+$/, '');

  // If URL is corrupt, incomplete, or contains mangled text, fallback to active Render production backend
  if (!rawUrl.startsWith('http') || rawUrl.length > 80 || rawUrl.includes('https://jarvis-ai-perso')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://jarvis-ai-personal-assistant-1.onrender.com';
    }
  }

  return rawUrl;
}

export const API_URL = getCleanApiUrl();
