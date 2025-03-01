import { NextResponse } from 'next/server';
import { getCachedGoldPayments } from '@/lib/cache-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

// GET /api/gold-payments - Get all gold payments
export async function GET() {
  try {
    console.log("📥 API: GET /api/gold-payments - Request received");
    
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔍 API: Fetching gold payments from cache or Google Sheets");
    const goldPayments = await getCachedGoldPayments();
    console.log(`📊 API: Retrieved ${goldPayments.length} gold payments before filtering`);
    
    // Filter payments based on user role
    let filteredGoldPayments = goldPayments;
    
    // If user isn't in a support role, only show their own payments
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Filtering gold payments for user with Discord ID: ${session.user.discordId}`);
      filteredGoldPayments = goldPayments.filter(payment => payment.discordId === session.user.discordId);
      console.log(`📊 API: Filtered to ${filteredGoldPayments.length} gold payments for this user`);
    } else {
      console.log(`👑 API: Support user accessing all ${goldPayments.length} gold payments`);
    }
    
    // Log a sample payment if available
    if (filteredGoldPayments.length > 0) {
      console.log("📝 API: Sample gold payment:", JSON.stringify(filteredGoldPayments[0]));
    }
    
    return NextResponse.json(filteredGoldPayments);
  } catch (error) {
    console.error('❌ API: Error fetching gold payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gold payments' },
      { status: 500 }
    );
  }
} 