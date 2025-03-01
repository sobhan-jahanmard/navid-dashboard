'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PaymentForm from '@/components/PaymentForm';

export default function AddPayment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check if user is authenticated and has the SUPPORT role
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // Redirect non-support users away from this page
      if (session?.user?.role !== 'SUPPORT') {
        setError('You do not have permission to access this page');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000); // Redirect after 2 seconds
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (data: any) => {
    // Check permission again before submitting
    if (session?.user?.role !== 'SUPPORT') {
      setError('You do not have permission to add payments');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Generate a random ID if not provided
    if (!data.id) {
      data.id = Date.now().toString();
    }

    try {
      // Generate timestamp for creation date
      data.timestamp = new Date().toISOString();
      
      // Make the API call
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Redirect to the dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Show loading screen while checking session
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // If user doesn't have permission, show error message
  if (status === 'authenticated' && session?.user?.role !== 'SUPPORT') {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <div className="mt-2 text-sm text-red-700">
                You do not have permission to access this page. Redirecting to dashboard...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Add New Payment</h1>
        <p className="text-gray-600">Fill in the payment details below</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <PaymentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
} 