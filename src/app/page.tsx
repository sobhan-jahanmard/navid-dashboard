'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold">
          <a href="https://discord.gg/Zjweus8Kdx" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
            Celestial Shop
          </a>
        </h1>
        
        {status === 'loading' ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : status === 'authenticated' ? (
          <div className="space-y-4">
            <p className="text-center">
              Welcome back, <span className="font-semibold">{session.user?.name}</span>!
            </p>
            <div className="flex justify-center">
              <Link 
                href="/dashboard" 
                className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center">Please sign in to access your dashboard</p>
            <div className="flex justify-center">
              <Link 
                href="/auth/signin" 
                className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
