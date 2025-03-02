import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin or support role
    if (!session || !session.user || !['ADMIN', 'SUPPORT'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For now, return a placeholder list of users
    // In a real implementation, this would fetch from your database or Google Sheets
    const users = [
      {
        _id: '1',
        discordId: session.user.discordId,
        name: session.user.name,
        email: null,
        image: session.user.image,
        role: session.user.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' }, 
      { status: 500 }
    );
  }
} 