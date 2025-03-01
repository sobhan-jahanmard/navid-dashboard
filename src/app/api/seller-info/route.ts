import { NextRequest, NextResponse } from 'next/server';
import { getSellerInfoByDiscordId, addOrUpdateSellerInfo } from '@/lib/googleSheetsHelper';

// GET handler - Fetch seller info based on Discord ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');

    if (!discordId) {
      return NextResponse.json(
        { error: 'Discord ID is required' },
        { status: 400 }
      );
    }

    const sellerInfo = await getSellerInfoByDiscordId(discordId);
    return NextResponse.json(sellerInfo);
  } catch (error) {
    console.error('Error fetching seller info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller information' },
      { status: 500 }
    );
  }
}

// POST handler - Add or update seller info
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.discordId) {
      return NextResponse.json(
        { error: 'Discord ID is required' },
        { status: 400 }
      );
    }
    
    const sellerInfo = {
      discordId: body.discordId,
      cardNumber: body.cardNumber || '',
      iban: body.iban || '',
      nameOnCard: body.nameOnCard || '',
      phoneNumber: body.phoneNumber || ''
    };
    
    const result = await addOrUpdateSellerInfo(sellerInfo);
    return NextResponse.json({
      success: true,
      message: `Seller information ${result.action}`,
      data: sellerInfo
    });
  } catch (error) {
    console.error('Error saving seller info:', error);
    return NextResponse.json(
      { error: 'Failed to save seller information' },
      { status: 500 }
    );
  }
} 