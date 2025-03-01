import { Metadata } from 'next';
import UserInfo from '@/components/UserInfo';

export const metadata: Metadata = {
  title: 'User Profile | Celestial Shop',
  description: 'User profile information',
};

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">My Profile</h1>
      <UserInfo />
    </div>
  );
} 