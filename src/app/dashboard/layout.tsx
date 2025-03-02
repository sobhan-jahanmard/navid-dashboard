// Server component (no 'use client' directive)
import { Metadata } from 'next';
import DashboardNavigation from './DashboardNavigation';

export const metadata: Metadata = {
  title: 'Dashboard | Celestial Shop',
  description: 'User dashboard for the payment management system',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNavigation />
      <div className="py-6 md:py-10">
        <main>
          <div className="w-full max-w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 