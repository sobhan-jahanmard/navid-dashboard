'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function LoopDetector() {
  const { data: session, status } = useSession();
  const [authAttempts, setAuthAttempts] = useState(0);
  const [loopDetected, setLoopDetected] = useState(false);

  useEffect(() => {
    // Track auth attempts in session storage
    const storedAttempts = sessionStorage.getItem('authAttempts');
    const attempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
    
    if (attempts > 3) {
      setLoopDetected(true);
      sessionStorage.setItem('authAttempts', '0');
    } else {
      sessionStorage.setItem('authAttempts', (attempts + 1).toString());
      setAuthAttempts(attempts + 1);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Authentication Status</h1>
        
        {loopDetected ? (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div>
                  <h3 className="text-lg font-medium text-red-800">Authentication Loop Detected</h3>    
                  <div className="mt-2 text-red-700">
                    <p>We've detected multiple authentication attempts in a short period.</p>
                    <p className="mt-2">Current session status: <strong>{status}</strong></p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  sessionStorage.clear();
                  signOut({ callbackUrl: '/' });
                }}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Sign Out & Clear Session
              </button>
              
              <Link 
                href="/" 
                className="rounded bg-gray-200 px-4 py-2 text-center text-gray-800 hover:bg-gray-300"
              >
                Return to Home
              </Link>
              
              <button
                onClick={() => {
                  sessionStorage.setItem('authAttempts', '0');
                  signIn('discord', { callbackUrl: '/dashboard' });
                }}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try Authentication Again
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Authentication attempt #{authAttempts}</p>
            <p>Current status: <strong>{status}</strong></p>
            
            {status === 'authenticated' ? (
              <div>
                <p>Signed in as: {session?.user?.name}</p>
                <div className="mt-4 flex space-x-4">
                  <Link 
                    href="/dashboard" 
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Sign in with Discord
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 