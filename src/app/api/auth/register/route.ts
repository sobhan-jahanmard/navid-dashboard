import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, password } = await request.json();
    
    // Validate required fields
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: UserRole.USER,
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    return NextResponse.json(
      { message: 'User registered successfully', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 