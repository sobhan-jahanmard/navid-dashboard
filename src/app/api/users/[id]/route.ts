import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/users/[id] - Get a specific user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get the user
    const user = await User.findById(params.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update a user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Parse request body
    const body = await request.json();
    
    // Prevent changing own role (security measure)
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (targetUser.discordId === session.user.discordId && body.role && body.role !== targetUser.role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
    }
    
    // Update the user
    const user = await User.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 