'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import Button from './ui/Button';

const UserInfo = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
          <div className="flex animate-pulse flex-col space-y-4">
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-300"></div>
            <div className="h-6 w-3/4 rounded bg-gray-300"></div>
            <div className="h-4 rounded bg-gray-300"></div>
            <div className="h-4 w-1/2 rounded bg-gray-300"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
          <p className="text-center text-gray-600">Please sign in to view your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-md">
        <div className="bg-blue-600 p-4">
          <h2 className="text-center text-2xl font-bold text-white">User Profile</h2>
        </div>
        
        <div className="flex flex-col items-center p-6">
          <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md">
            {session.user.image ? (
              <Image 
                src={session.user.image} 
                alt={session.user.name || 'User'} 
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-4xl font-bold text-gray-400">
                {session.user.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          
          <h3 className="mb-2 text-xl font-semibold">{session.user.name}</h3>
          
          <div className="mb-4 w-full space-y-3 rounded-md bg-gray-50 p-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-gray-600">Discord:</span>
              <span className="col-span-2 truncate">{session.user.discordUsername}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-gray-600">Discord ID:</span>
              <span className="col-span-2 truncate">{session.user.discordId}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-gray-600">Role:</span>
              <span className={`col-span-2 rounded-full px-2 py-1 text-center text-sm font-medium ${
                session.user.role === 'SUPPORT' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {session.user.role === 'SUPPORT' ? 'Support' : 'Member'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={() => signOut({ callbackUrl: '/' })}
            variant="secondary"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserInfo; 