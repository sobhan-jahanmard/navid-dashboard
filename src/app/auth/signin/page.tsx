'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignIn() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Check for error parameters in the URL (which NextAuth will add)
  useEffect(() => {
    const errorType = searchParams?.get('error');
    if (errorType) {
      console.error('Auth error from URL:', errorType);
      setError(`Authentication error: ${errorType}`);
    }
    
    // Log the session state for debugging
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    // Redirect to dashboard if already authenticated
    if (status === 'authenticated') {
      console.log('User is authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [searchParams, status, session, router]);

  const handleDiscordSignIn = async () => {
    try {
      setLoading(true);
      console.log('Starting Discord sign-in process...');
      
      // Use simpler options for Discord sign-in
      await signIn('discord', {
        callbackUrl: '/dashboard',
        redirect: true
      });
      
      // This code won't execute due to the redirect
    } catch (error) {
      console.error('Error during Discord sign-in:', error);
      setError('Failed to initiate Discord sign-in');
      setLoading(false);
    }
  };

  // If already authenticated, show a message while redirecting
  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
          <p>You are already signed in. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Sign In</h1>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {/* Discord Sign In Button */}
        <div className="mb-6">
          <button
            onClick={handleDiscordSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md border border-transparent bg-[#5865F2] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4752c4] focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
              <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"/>
            </svg>
            Sign in with Discord
          </button>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>This application requires Discord authentication</p>
          <p className="mt-2">Access will be determined by your Discord roles</p>
        </div>
      </div>
    </div>
  );
} 