'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PaymentForm from '@/components/PaymentForm';

interface EditPaymentProps {
  params: {
    id: string;
  };
}

export default function EditPayment({ params }: EditPaymentProps) {
  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = params;
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check if user is authenticated and has the SUPPORT role
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    } else if (status === 'authenticated') {
      // Redirect non-support users away from this page
      if (session?.user?.role !== 'SUPPORT') {
        setError('You do not have permission to access this page');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000); // Redirect after 2 seconds
        return;
      }
    } else if (status === 'loading') {
      // Still loading session, don't fetch payment yet
      return;
    }

    // Only fetch payment if user has proper permissions
    const fetchPayment = async () => {
      try {
        const response = await fetch(`/api/payments/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment');
        }
        
        const data = await response.json();
        setPayment(data);
        setIsLoading(false);
      } catch (err) {
        setError('Error loading payment. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchPayment();
  }, [id, status, session, router]);

  const handleSubmit = async (data: any) => {
    // Check permission again before submitting
    if (session?.user?.role !== 'SUPPORT') {
      setError('You do not have permission to edit payments');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment');
      }
      
      router.push('/dashboard');
    } catch (err) {
      setError('Error updating payment. Please try again later.');
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

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-red-500">{error || 'Payment not found'}</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-lg font-medium text-gray-900">Edit Payment</h1>
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        <PaymentForm
          initialData={payment}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
} 