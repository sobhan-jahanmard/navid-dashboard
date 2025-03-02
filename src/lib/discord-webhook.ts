import axios from 'axios';
import { format } from 'date-fns';

interface WebhookPayload {
  id: string;
  discordId: string;
  amount: number | string;
  price: number | string;
  gheymat?: number | string;
  totalRial?: number | string;
  finalAmount?: number | string;
  paymentDuration: string;
  game: string;
  admin?: string;
  note?: string;
  timestamp: Date;
  sheba?: string;
  iban?: string;
  cardNumber?: string;
  nameOnCard?: string;
  name?: string;
  realm?: string;
  action?: string;
  status?: string;
}

/**
 * Sends payment details to a Discord webhook
 */
export async function sendToDiscordWebhook(paymentData: WebhookPayload): Promise<boolean> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discordapp.com/api/webhooks/1318601819273826334/Xrip6fSp8-S5T1YhL2eJjBmzdpIaVbZr0d6_gmVowy_ZO14yndKE8WJcnVMyFB0r1Ydz';
    
    if (!webhookUrl) {
      console.error('Discord webhook URL not configured');
      return false;
    }
    
    // Determine color based on status or action
    let color = 3447003; // Default blue
    if (paymentData.status === 'Paid' || paymentData.action === 'paid') {
      color = 3066993; // Green
    } else if (paymentData.status === 'Cancelled' || paymentData.action === 'cancelled') {
      color = 15158332; // Red
    }
    
    // Format the amount values for display
    const formatValue = (value: any) => {
      if (value === undefined || value === null) return 'N/A';
      if (typeof value === 'number') {
        return value.toLocaleString('en-US');
      }
      return String(value);
    };
    
    const formattedDate = format(new Date(paymentData.timestamp), 'PPpp');
    const game = paymentData.realm || paymentData.game;
    
    // Build fields based on available data
    const fields = [
      { name: 'Amount', value: formatValue(paymentData.amount), inline: true },
      { name: 'Price', value: `${formatValue(paymentData.price)} Toman`, inline: true },
    ];
    
    // Add finalAmount, gheymat or totalRial (whichever is available)
    if (paymentData.finalAmount) {
      fields.push({ name: 'Gheymat', value: `${formatValue(paymentData.finalAmount)} Rial`, inline: true });
    } else if (paymentData.gheymat) {
      fields.push({ name: 'Gheymat', value: formatValue(paymentData.gheymat), inline: true });
    } else if (paymentData.totalRial) {
      fields.push({ name: 'Total (Rial)', value: formatValue(paymentData.totalRial), inline: true });
    }
    
    // Add other fields
    fields.push(
      { name: 'Payment Duration', value: paymentData.paymentDuration || 'N/A', inline: true },
      { name: 'Game', value: game || 'N/A', inline: true },
    );
    
    // Add admin if available
    if (paymentData.admin) {
      fields.push({ name: 'Admin', value: paymentData.admin, inline: true });
    }
    
    // Add note if available
    if (paymentData.note) {
      fields.push({ name: 'Note', value: paymentData.note, inline: false });
    }
    
    // Add ID fields
    fields.push(
      { name: 'id', value: paymentData.discordId || 'N/A', inline: false },
      { name: 'payment id', value: paymentData.id || 'N/A', inline: false }
    );
    
    // Add action if available
    if (paymentData.action) {
      fields.push({ name: 'action', value: paymentData.action=="added" ? "create" : paymentData.action, inline: false });
    } else if (paymentData.status) {
      fields.push({ name: 'Status', value: paymentData.status, inline: false });
    }
    
    // Add payment details
    if (paymentData.sheba || paymentData.iban) {
      fields.push({ name: 'Sheba', value: paymentData.sheba || paymentData.iban || 'N/A', inline: false });
    }
    
    if (paymentData.nameOnCard || paymentData.name) {
      fields.push({ name: 'Name', value: paymentData.nameOnCard || paymentData.name || 'N/A', inline: false });
    }
    
    const payload = {
      content: `A new payment has been processed for <@${paymentData.discordId}>`,
      username: "Celestial Payment",
      avatar_url: "https://cdn.discordapp.com/icons/1219645545115680888/a_3a497a72fc59e5dae8fb47115469b268.webp?size=128",
      embeds: [
        {
          title: `Payment Details for ${paymentData.discordId}`,
          color: color,
          fields: fields,
          footer: { text: `Processed on ${formattedDate}` }
        }
      ]
    };
    
    await axios.post(webhookUrl, payload);
    console.log('Discord webhook notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending to Discord webhook:', error);
    return false;
  }
} 