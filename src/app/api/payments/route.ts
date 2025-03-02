import { NextRequest, NextResponse } from 'next/server';
import { addPayment } from '@/lib/googleSheetsHelper';
import { getCachedPayments, invalidatePaymentsCache } from '@/lib/cache-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { sendToDiscordWebhook } from '@/lib/discord-webhook';
import { getSellerInfoByDiscordId, addOrUpdateSellerInfo } from '@/lib/googleSheetsHelper';

// GET /api/payments - Get all payments
export async function GET() {
  try {
    console.log("📥 API: GET /api/payments - Request received");
    
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔍 API: Fetching payments from cache or Google Sheets");
    const payments = await getCachedPayments();
    console.log(`📊 API: Retrieved ${payments.length} payments before filtering`);
    
    // Filter payments based on user role
    let filteredPayments = payments;
    
    // If user isn't in a support role, only show their own payments
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Filtering payments for user with Discord ID: ${session.user.discordId}`);
      filteredPayments = payments.filter(payment => payment.discordId === session.user.discordId);
      console.log(`📊 API: Filtered to ${filteredPayments.length} payments for this user`);
    } else {
      console.log(`👑 API: Support user accessing all ${payments.length} payments`);
    }
    
    // Log a sample payment if available
    if (filteredPayments.length > 0) {
      console.log("📝 API: Sample payment:", JSON.stringify(filteredPayments[0]));
    }
    
    return NextResponse.json(filteredPayments);
  } catch (error) {
    console.error('❌ API: Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("🔒 API: Unauthorized access attempt");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow SUPPORT role to create new payments
    if (session.user.role !== 'SUPPORT') {
      console.log(`🔒 API: Non-support user ${session.user.username} tried to create a payment`);
      return NextResponse.json({ error: 'Forbidden: Only support staff can create payments' }, { status: 403 });
    }

    console.log(`✅ API: Support user ${session.user.username} creating new payment`);
    const paymentData = await request.json();
    
    // Add user info to payment data
    paymentData.user = session.user.username;
    
    // Check if seller exists in Seller Info
    if (paymentData.discordId) {
      console.log(`🔍 API: Checking if seller with Discord ID ${paymentData.discordId} exists`);
      
      const sellerInfo = await getSellerInfoByDiscordId(paymentData.discordId);
      
      // If seller doesn't exist and we have their info, add them to Seller Info
      if (!sellerInfo.found && paymentData.cardNumber && paymentData.iban && paymentData.nameOnCard) {
        console.log(`➕ API: Adding new seller with Discord ID ${paymentData.discordId} to Seller Info`);
        
        try {
          // Validate IBAN format
          if (!/^IR\d{24}$/.test(paymentData.iban)) {
            return NextResponse.json({ 
              error: 'IBAN must be in the format of IR followed by 24 digits' 
            }, { status: 400 });
          }
          
          // Add to Seller Info
          await addOrUpdateSellerInfo({
            discordId: paymentData.discordId,
            cardNumber: paymentData.cardNumber,
            iban: paymentData.iban,
            nameOnCard: paymentData.nameOnCard,
            phoneNumber: paymentData.phoneNumber || '',
          });
          
          console.log(`✅ API: Successfully added seller info for Discord ID ${paymentData.discordId}`);
        } catch (sellerError) {
          console.error('⚠️ API: Failed to add seller info:', sellerError);
          // Continue with payment even if seller info fails
        }
      }
    }
    
    // Validate required fields
    const requiredFields = [
      "amount",
      "price",
      "totalRial",
      "user",
      "discordId",
      "iban",
      "paymentDuration",
      "game",
    ];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Validate IBAN format
    if (paymentData.iban && !/^IR\d{24}$/.test(paymentData.iban)) {
      return NextResponse.json({ error: 'IBAN must be in the format of IR followed by 24 digits' }, { status: 400 });
    }
    
    const result = await addPayment(paymentData);
    
    // Invalidate the cache so the next request will get fresh data
    invalidatePaymentsCache();
    
    // Send Discord webhook notification
    try {
      await sendToDiscordWebhook({
        ...paymentData,
        timestamp: new Date(),
        admin: session.user.username,
        action: 'added',
      });
      console.log('📨 API: Discord notification sent for new payment');
    } catch (webhookError) {
      console.error('⚠️ API: Failed to send Discord notification:', webhookError);
      // Continue with the response even if webhook fails
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 