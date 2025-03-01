'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// Component with useSearchParams
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'An error occurred during authentication.';
  
  // Map error codes to user-friendly messages
  if (error === 'CredentialsSignin') {
    errorMessage = 'Invalid username or password.';
  } else if (error === 'OAuthCallback') {
    errorMessage = 'There was a problem with the authentication process.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold text-red-600">Authentication Error</h1>
        
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
        
        <div className="mt-6 flex justify-center space-x-4">
          <Link 
            href="/auth/signin" 
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Sign In
          </Link>
          
          <Link 
            href="/" 
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function ErrorLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Loading error details...</h1>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function AuthError() {
  return (
    <Suspense fallback={<ErrorLoading />}>
      <ErrorContent />
    </Suspense>
  );
} 