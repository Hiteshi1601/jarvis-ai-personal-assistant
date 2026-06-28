'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      window.location.href = `${backendUrl}/api/auth/google/callback?code=${code}`;
    } else {
      router.push('/auth-error?reason=no_code_provided');
    }
  }, [searchParams, router]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-cyber-bg space-y-4">
      <div className="relative flex items-center justify-center w-20 h-20 rounded-full border border-cyber-blue/30 shadow-glow-cyan animate-pulse">
        <div className="w-8 h-8 text-cyber-blue animate-spin-slow flex items-center justify-center text-2xl font-bold">🔄</div>
      </div>
      <span className="text-sm font-mono text-cyber-blue tracking-widest uppercase">
        VERIFYING_CREDENTIALS...
      </span>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-cyber-bg space-y-4">
        <span className="text-sm font-mono text-cyber-blue tracking-widest uppercase animate-pulse">
          INITIALIZING_SECURE_AUTH_TUNNEL...
        </span>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
