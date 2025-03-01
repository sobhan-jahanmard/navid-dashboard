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
      <div className="py-10">
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 