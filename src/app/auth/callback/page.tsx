'use client';

import { useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// Inner component that uses useSearchParams
function CallbackContent() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    // If we have the code and state parameters, process the login
    if (code && state && status === 'unauthenticated') {
      // Complete authentication process
      signIn('discord', { 
        callbackUrl: '/dashboard',
        redirect: false
      }).then(() => {
        // This will be called after authentication completes
        router.push('/dashboard');
      });
    } else if (status === 'authenticated') {
      // Already authenticated, redirect to dashboard
      router.push('/dashboard');
    }
  }, [code, state, status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Completing login...</h1>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}

// Loading state for Suspense
function CallbackLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Preparing login...</h1>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function AuthCallback() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackContent />
    </Suspense>
  );
} 