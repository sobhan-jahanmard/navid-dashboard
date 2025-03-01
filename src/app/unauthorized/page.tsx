import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Unauthorized Access</h1>
          <div className="mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-red-700">
              You do not have permission to access this page. This area is restricted to administrators only.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <Link
              href="/dashboard"
              className="block w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Dashboard
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 