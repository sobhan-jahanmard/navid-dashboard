import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updatePayment, deletePayment } from '@/lib/googleSheetsHelper';
import { getCachedPayments, invalidatePaymentsCache } from '@/lib/cache-utils';
import { sendToDiscordWebhook } from '@/lib/discord-webhook';

// Shared function to extract and validate params before using them
function getValidatedParams(context: { params: { id: string } }): string {
  // In Next.js App Router, context.params is guaranteed to exist and have an id property
  // for routes with dynamic parameters like [id]
  const id = context.params.id;
  if (!id) {
    throw new Error('Invalid or missing payment ID');
  }
  return id;
}

// GET /api/payments/[id] - Get a specific payment
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const paymentId = getValidatedParams(context);
    console.log(`GET request for payment ID: ${paymentId}`);
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get payments from cache and find the specific one
    const payments = await getCachedPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update a payment
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const paymentId = getValidatedParams(context);
    console.log(`PUT request for payment ID: ${paymentId}`);
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow SUPPORT role to update payments
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Non-support user ${session.user.username} tried to update payment ${paymentId}`);
      return NextResponse.json({ error: 'Forbidden: Only support staff can update payments' }, { status: 403 });
    }

    const paymentData = await request.json();
    
    // Get the existing payment to include in the notification
    const payments = await getCachedPayments();
    const existingPayment = payments.find(p => p.id === paymentId || p._id === paymentId);
    
    // Check if this is a status update only
    if (paymentData.status) {
      // If only updating status, just pass the status field
      console.log(`✅ Updating payment status with ID: ${paymentId} to ${paymentData.status}`);
      const result = await updatePayment(paymentId, { status: paymentData.status });
      
      // Invalidate the payments cache after update
      invalidatePaymentsCache();
      
      // Send Discord webhook notification for status updates
      try {
        await sendToDiscordWebhook({
          ...existingPayment,
          id: paymentId,
          timestamp: new Date(),
          admin: session.user.username || session.user.name,
          action: paymentData.status.toLowerCase(),
          status: paymentData.status,
        });
        console.log(`📨 API: Discord notification sent for payment status update to ${paymentData.status}`);
      } catch (webhookError) {
        console.error('⚠️ API: Failed to send Discord notification:', webhookError);
      }
      
      return NextResponse.json(result);
    }
    
    // If not just a status update, handle as a full update
    console.log(`✅ Updating payment with ID: ${paymentId}`);
    const result = await updatePayment(paymentId, paymentData);
    
    // Invalidate the payments cache after update
    invalidatePaymentsCache();
    
    // Send Discord webhook notification for status updates
    if (paymentData.status || paymentData.paid !== undefined) {
      const action = paymentData.status || (paymentData.paid ? 'Paid' : 'Pending');
      
      try {
        await sendToDiscordWebhook({
          ...existingPayment,
          ...paymentData,
          id: paymentId,
          timestamp: new Date(),
          admin: session.user.username || session.user.name,
          action: action.toLowerCase(),
          status: paymentData.status || (paymentData.paid ? 'Paid' : 'Pending'),
        });
        console.log(`📨 API: Discord notification sent for payment status update to ${action}`);
      } catch (webhookError) {
        console.error('⚠️ API: Failed to send Discord notification:', webhookError);
        // Continue with the response even if webhook fails
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id] - Delete a payment
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const paymentId = getValidatedParams(context);
    console.log(`DELETE request for payment ID: ${paymentId}`);
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only allow SUPPORT role to delete payments
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Non-support user ${session.user.username} tried to delete payment ${paymentId}`);
      return NextResponse.json({ error: 'Forbidden: Only support staff can delete payments' }, { status: 403 });
    }
    
    console.log(`✅ Deleting payment with ID: ${paymentId}`);
    const result = await deletePayment(paymentId);
    
    // Invalidate the payments cache after deletion
    invalidatePaymentsCache();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
} 