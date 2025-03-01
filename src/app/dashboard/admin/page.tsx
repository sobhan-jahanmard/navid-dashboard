'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface User {
  _id: string;
  discordId: string;
  name: string;
  email?: string;
  image?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPanel() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Redirect if not admin
    if (session && session.user && session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
        setIsLoading(false);
      } catch (err) {
        setError('Error loading users. Please try again later.');
        setIsLoading(false);
      }
    };
    
    if (session) {
      fetchUsers();
    }
  }, [session, router]);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      // Update the user in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      setError('Error updating user role. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-red-500">{error}</div>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-lg font-medium text-gray-900">Admin Panel</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage users and their roles
        </p>
      </div>
      
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discord ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.image && (
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={user.image}
                            alt={user.name}
                          />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{user.discordId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant={user.role === 'admin' ? 'warning' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleRole(user._id, user.role)}
                      disabled={user.discordId === session?.user?.discordId} // Can't change own role
                    >
                      {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 