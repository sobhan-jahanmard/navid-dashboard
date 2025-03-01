import mongoose, { Schema } from 'mongoose';

// Define the Payment Time options
export const PaymentTimeOptions = [
  'Instant',
  '1-2 days',
  '2-3 days',
  '3-5 days',
  '5-10 days',
];

// Define the Payment schema
const PaymentSchema = new Schema(
  {
    discordId: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    paymentTime: {
      type: String,
      enum: PaymentTimeOptions,
      required: true,
    },
    expectedPaymentDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    gheymat: {
      type: Number,
      required: true,
    },
    game: {
      type: String,
      required: true,
    },
    shomare_kart: {
      type: String,
      required: true,
    },
    shomare_sheba: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    shomare_tamas: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
    admin: {
      type: String,
      required: true,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidBy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Create the model if it doesn't exist
export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema); 