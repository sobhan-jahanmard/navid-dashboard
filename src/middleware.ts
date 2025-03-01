import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLE ALL MIDDLEWARE REDIRECTS
  // Just allow the request to proceed for debugging
  return NextResponse.next();
  
  // We'll uncomment the below once we fix the loop
  /*
  // Check if the request is for the dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('next-auth.session-token')?.value;
    
    // If no token, redirect to sign in
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    // Check for admin routes
    if (pathname.startsWith('/dashboard/admin')) {
      // Admin check logic here
    }
  }
  
  return NextResponse.next();
  */
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*'],
}; 