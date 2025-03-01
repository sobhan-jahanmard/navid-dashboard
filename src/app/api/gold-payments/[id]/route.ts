import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateGoldPaymentStatus } from '@/lib/googleSheetsHelper';
import { invalidateGoldPaymentsCache, getCachedGoldPayments } from '@/lib/cache-utils';
import { sendToDiscordWebhook } from '@/lib/discord-webhook';

// Shared function to extract and validate params before using them
function getValidatedParams(context: { params: { id: string } }): string {
  const id = context.params.id;
  if (!id) {
    throw new Error('Invalid or missing gold payment ID');
  }
  return id;
}

// PUT /api/gold-payments/[id] - Update a gold payment status
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const paymentId = getValidatedParams(context);
    console.log(`PUT request for gold payment ID: ${paymentId}`);
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow SUPPORT role to update gold payment status
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Non-support user ${session.user.username} tried to update gold payment ${paymentId}`);
      return NextResponse.json({ error: 'Forbidden: Only support staff can update gold payment status' }, { status: 403 });
    }

    const paymentData = await request.json();
    
    // Get the existing gold payment to include in the notification
    const goldPayments = await getCachedGoldPayments();
    const existingPayment = goldPayments.find(p => p.id === paymentId);
    
    // Include the user who made the update
    paymentData.paidBy = session.user.username || session.user.name;
    
    console.log(`✅ Updating gold payment with ID: ${paymentId}`);
    const result = await updateGoldPaymentStatus(paymentId, paymentData);
    
    // Invalidate the gold payments cache after update
    invalidateGoldPaymentsCache();
    
    // Send Discord webhook notification for status updates
    if (paymentData.status) {
      try {
        await sendToDiscordWebhook({
          ...existingPayment,
          ...paymentData,
          id: paymentId,
          timestamp: new Date(),
          admin: session.user.username || session.user.name,
          action: paymentData.status.toLowerCase(),
          realm: existingPayment?.nameRealm || 'Unknown',
          paymentDuration: 'Gold Payment',
        });
        console.log(`📨 API: Discord notification sent for gold payment status update to ${paymentData.status}`);
      } catch (webhookError) {
        console.error('⚠️ API: Failed to send Discord notification:', webhookError);
        // Continue with the response even if webhook fails
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating gold payment:', error);
    return NextResponse.json(
      { error: 'Failed to update gold payment' },
      { status: 500 }
    );
  }
} 