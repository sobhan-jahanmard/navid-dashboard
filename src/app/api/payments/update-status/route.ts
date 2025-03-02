import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updatePayment } from '@/lib/googleSheetsHelper';
import { invalidatePaymentsCache, getCachedPayments } from '@/lib/cache-utils';
import { sendToDiscordWebhook } from '@/lib/discord-webhook';

// POST /api/payments/update-status - Batch update payment statuses
export async function POST(request: NextRequest) {
  try {
    console.log("📥 API: POST /api/payments/update-status - Batch status update requested");
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("🔒 API: Unauthorized access attempt for batch update");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow SUPPORT role to update payment statuses
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Non-support user ${session.user.username} tried to batch update payment statuses`);
      return NextResponse.json({ error: 'Forbidden: Only support staff can update payments' }, { status: 403 });
    }

    // Get data from request
    const { paymentIds, status, updatedBy } = await request.json();
    
    // Validate inputs
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty payment IDs array' }, { status: 400 });
    }
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    console.log(`✅ API: Batch updating ${paymentIds.length} payments to status: ${status}`);
    
    // Get existing payments for webhook data
    const allPayments = await getCachedPayments();
    
    // Process each payment update
    const updateResults = await Promise.all(
      paymentIds.map(async (paymentId) => {
        try {
          // Find the existing payment to include in webhook
          const existingPayment = allPayments.find(p => p.id === paymentId || p._id === paymentId);
          
          if (!existingPayment) {
            console.warn(`⚠️ API: Payment ${paymentId} not found in cached payments`);
            return { paymentId, success: false, error: 'Payment not found' };
          }
          
          // Update the payment status
          const result = await updatePayment(paymentId, { 
            status, 
            whoPaidCancelled: updatedBy || session.user.username || session.user.name 
          });
          
          // Send Discord webhook notification with complete payment data
          try {
            await sendToDiscordWebhook({
              ...existingPayment,
              id: paymentId,
              timestamp: new Date(),
              admin: session.user.username || session.user.name,
              action: status.toLowerCase(),
              status: status,
              // Ensure required fields are present
              discordId: existingPayment.discordId || 'unknown',
              amount: existingPayment.amount || 0,
              price: existingPayment.price || 0,
              paymentDuration: existingPayment.paymentDuration || 'N/A',
              game: existingPayment.game || 'Unknown'
            });
          } catch (webhookError) {
            console.error(`⚠️ API: Failed to send Discord notification for payment ${paymentId}:`, webhookError);
            // Continue processing even if webhook fails
          }
          
          return { paymentId, success: true, result };
        } catch (error) {
          console.error(`❌ API: Error updating payment ${paymentId}:`, error);
          return { paymentId, success: false, error: (error as Error).message };
        }
      })
    );
    
    // Invalidate the payments cache after updates
    invalidatePaymentsCache();
    
    // Check for any failures
    const failures = updateResults.filter(result => !result.success);
    if (failures.length > 0) {
      console.warn(`⚠️ API: ${failures.length}/${paymentIds.length} payments failed to update`);
      return NextResponse.json({
        message: `Updated ${paymentIds.length - failures.length}/${paymentIds.length} payments`,
        failures,
        results: updateResults
      }, { status: 207 }); // 207 Multi-Status
    }
    
    console.log(`✅ API: Successfully updated all ${paymentIds.length} payments`);
    return NextResponse.json({
      message: `Successfully updated ${paymentIds.length} payments`,
      results: updateResults
    });
    
  } catch (error) {
    console.error('❌ API: Error in batch update:', error);
    return NextResponse.json(
      { error: 'Failed to update payment statuses' },
      { status: 500 }
    );
  }
} 