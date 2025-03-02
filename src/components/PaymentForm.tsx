import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

interface SellerInfo {
  id: string;
  discordId?: string;
  cardNumber?: string;
  iban?: string;
  nameOnCard?: string;
  phoneNumber?: string;
  sellerInfoAction?: string;
  found?: boolean;
}

interface PaymentFormData {
  id?: string;
  amount: string;
  price: string;
  totalRial: string;
  user: string;
  discordId: string;
  cardNumber: string;
  iban: string;
  nameOnCard: string;
  phoneNumber: string;
  paymentDuration: string;
  note: string;
  game: string;
  sellerInfoAction?: string;
}

interface PaymentFormProps {
  initialData?: PaymentFormData;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<PaymentFormData>(
    initialData || {
      id: '',
      amount: '',
      price: '',
      totalRial: '',
      user: '',
      discordId: '',
      cardNumber: '',
      iban: '',
      nameOnCard: '',
      phoneNumber: '',
      paymentDuration: '1-2 days',
      note: '',
      game: '',
    }
  );
  const [isLoadingSellerInfo, setIsLoadingSellerInfo] = useState(false);
  const [sellerInfoError, setSellerInfoError] = useState<string | null>(null);
  const [sellerInfoEditable, setSellerInfoEditable] = useState(true);
  const [sellerInfoFound, setSellerInfoFound] = useState(false);
  const [isSavingSellerInfo, setIsSavingSellerInfo] = useState(false);
  const [sellerInfoSaved, setSellerInfoSaved] = useState(false);
  const [originalSellerInfo, setOriginalSellerInfo] = useState({
    discordId: '',
    cardNumber: '',
    iban: '',
    nameOnCard: '',
    phoneNumber: '',
  });

  // Calculate total in Rial whenever amount or price changes
  useEffect(() => {
    if (formData.amount && formData.price) {
      const amount = parseFloat(formData.amount.toString().replace(/,/g, ''));
      const price = parseFloat(formData.price.toString().replace(/,/g, ''));
      
      if (!isNaN(amount) && !isNaN(price)) {
        const total = amount * price * 10;
        setFormData((prev) => ({
          ...prev,
          totalRial: formatNumber(total),
        }));
      }
    }
  }, [formData.amount, formData.price]);

  // Format number with commas (e.g., 1,000,000)
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Parse formatted number
  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, ''));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs with formatting
    if (name === 'amount' || name === 'price') {
      let formattedValue = value;
      
      // Remove commas before processing
      const numericValue = value.replace(/,/g, '');
      
      if (numericValue !== '') {
        const parsedValue = parseFloat(numericValue);
        if (!isNaN(parsedValue)) {
          formattedValue = formatNumber(parsedValue);
        }
      }
      
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
      return;
    }
    
    // Handle IBAN input for validation (IR + 24 digits only)
    if (name === 'iban') {
      // Always uppercase the "IR" part
      const uppercaseValue = value.toUpperCase();
      
      // Enforce the pattern: IR followed by up to 24 digits
      const pattern = /^IR\d{0,24}$/;
      if (pattern.test(uppercaseValue) || uppercaseValue === '' || uppercaseValue === 'I' || uppercaseValue === 'IR') {
        setFormData((prev) => ({ ...prev, [name]: uppercaseValue }));
      }
      return;
    }
    
    // Handle text inputs
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchSellerInfo = async () => {
    if (!formData.discordId) {
      setSellerInfoError('Please enter a Discord ID');
      return;
    }

    setIsLoadingSellerInfo(true);
    setSellerInfoError(null);
    setSellerInfoSaved(false);

    try {
      const response = await fetch(`/api/seller-info?discordId=${formData.discordId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch seller information');
      }

      const data: SellerInfo = await response.json();

      if (data.found) {
        // Save original seller data for reset functionality
        setOriginalSellerInfo({
          discordId: data.discordId || '',
          cardNumber: data.cardNumber || '',
          iban: data.iban || '',
          nameOnCard: data.nameOnCard || '',
          phoneNumber: data.phoneNumber || '',
        });

        // Update form data with non-nullable values
        setFormData((prev) => ({
          ...prev,
          cardNumber: data.cardNumber || '',
          iban: data.iban || '',
          nameOnCard: data.nameOnCard || '',
          phoneNumber: data.phoneNumber || '',
        }));
        
        setSellerInfoFound(true);
        setSellerInfoEditable(false); // Make fields read-only after fetch
      } else {
        setSellerInfoError('No seller found with this Discord ID. Please enter seller information and save.');
        setSellerInfoFound(false);
        setSellerInfoEditable(true); // Allow entering new information
      }
    } catch (error) {
      setSellerInfoError('Error fetching seller information');
    } finally {
      setIsLoadingSellerInfo(false);
    }
  };

  const handleEditSellerInfo = () => {
    setSellerInfoEditable(true);
  };

  const handleResetSellerInfo = () => {
    // Reset to original values
    setFormData((prev) => ({
      ...prev,
      cardNumber: originalSellerInfo.cardNumber,
      iban: originalSellerInfo.iban,
      nameOnCard: originalSellerInfo.nameOnCard,
      phoneNumber: originalSellerInfo.phoneNumber,
    }));
    
    // If it was a new seller, clear fields
    if (!sellerInfoFound) {
      setFormData((prev) => ({
        ...prev,
        cardNumber: '',
        iban: '',
        nameOnCard: '',
        phoneNumber: '',
      }));
    }
    
    setSellerInfoEditable(sellerInfoFound ? false : true);
    setSellerInfoError(null);
    setSellerInfoSaved(false);
  };

  const saveSellerInfo = async () => {
    if (!formData.discordId) {
      setSellerInfoError('Discord ID is required');
      return;
    }

    // Validate other required fields
    if (!formData.cardNumber || !formData.nameOnCard) {
      setSellerInfoError('Card number and Name on card are required');
      return;
    }
    
    // Validate IBAN format
    if (formData.iban && !/^IR\d{24}$/.test(formData.iban)) {
      setSellerInfoError('IBAN must be in the format of IR followed by 24 digits (IR + 24 numbers)');
      return;
    }

    setIsSavingSellerInfo(true);
    setSellerInfoError(null);

    try {
      const response = await fetch('/api/seller-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordId: formData.discordId || '',
          cardNumber: formData.cardNumber || '',
          iban: formData.iban || '',
          nameOnCard: formData.nameOnCard || '',
          phoneNumber: formData.phoneNumber || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save seller information');
      }

      const result = await response.json();
      
      // Update original data for reset functionality
      setOriginalSellerInfo({
        discordId: formData.discordId || '',
        cardNumber: formData.cardNumber || '',
        iban: formData.iban || '',
        nameOnCard: formData.nameOnCard || '',
        phoneNumber: formData.phoneNumber || '',
      });
      
      setSellerInfoFound(true);
      setSellerInfoEditable(false);
      setSellerInfoSaved(true);
      
      // Store action (added/updated) for success message
      setFormData(prev => ({
        ...prev,
        sellerInfoAction: result.message || 'saved'
      }));
    } catch (error: any) {
      setSellerInfoError(error.message || 'Error saving seller information');
    } finally {
      setIsSavingSellerInfo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate IBAN format
    if (formData.iban && !/^IR\d{24}$/.test(formData.iban)) {
      setSellerInfoError('IBAN must be in the format of IR followed by 24 digits (IR + 24 numbers)');
      return;
    }
    
    // Ensure the data format is compatible with Google Sheets
    const submissionData = {
      ...formData,
      // Store amount and price as numeric values without formatting
      amount: formData.amount ? parseFormattedNumber(formData.amount.toString()) : 0,
      price: formData.price ? parseFormattedNumber(formData.price.toString()) : 0,
      totalRial: formData.totalRial ? parseFormattedNumber(formData.totalRial.toString()) : 0,
      // Add current date
      date: new Date().toISOString(),
      // Status is always pending for new payments
      status: 'Pending',
      // Default to not paid
      paid: false,
      // Add user's username from session
      user: session?.user?.name || session?.user?.username || 'Unknown User',
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Discord ID search section */}
      <div className="bg-indigo-100 p-6 border border-indigo-200 rounded-lg mb-8 shadow-sm">
        <h3 className="text-lg font-semibold text-indigo-700 mb-5 border-b border-indigo-200 pb-2">
          Seller Information
        </h3>
        <div className="flex space-x-3 mb-4">
          <div className="flex-grow">
            <label htmlFor="discordId" className="block text-sm font-medium text-gray-700 mb-1">
              Discord ID
            </label>
            <input
              type="text"
              id="discordId"
              name="discordId"
              required
              autoComplete="off"
              value={formData.discordId || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              placeholder="Enter Discord ID"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={fetchSellerInfo}
              isLoading={isLoadingSellerInfo}
              disabled={isLoadingSellerInfo || !formData.discordId}
            >
              {sellerInfoFound && !isLoadingSellerInfo ? 'Found' : 'Fetch Info'}
            </Button>
          </div>
        </div>

        {/* Error message for seller info */}
        {sellerInfoError && (
          <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
            {sellerInfoError}
          </div>
        )}

        {/* Success message when seller info is found */}
        {sellerInfoFound && !sellerInfoSaved && !sellerInfoError && (
          <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
            Seller information found! Fields are read-only.
          </div>
        )}

        {/* Success message when seller info is saved */}
        {sellerInfoSaved && (
          <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
            Seller information {formData.sellerInfoAction || 'saved'} successfully!
          </div>
        )}

        {/* Bank details section with edit controls */}
        <div className="relative">
          {/* Edit controls */}
          <div className="flex justify-end space-x-2 mb-4">
            {!sellerInfoEditable && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleEditSellerInfo}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </span>
              </Button>
            )}
            {sellerInfoEditable && (
              <>
                {sellerInfoFound && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleResetSellerInfo}
                  >
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveSellerInfo}
                  isLoading={isSavingSellerInfo}
                  disabled={isSavingSellerInfo || !formData.discordId}
                >
                  <span className="flex items-center">
                    {!isSavingSellerInfo && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Save
                  </span>
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            {/* Card Number */}
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                required
                value={formData.cardNumber || ''}
                onChange={handleChange}
                disabled={!sellerInfoEditable}
                className={`block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${!sellerInfoEditable ? 'bg-gray-50 text-gray-700' : 'bg-white'}`}
                placeholder="Card Number"
              />
            </div>

            {/* IBAN */}
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                IBAN
              </label>
              <input
                type="text"
                id="iban"
                name="iban"
                required
                value={formData.iban || ''}
                onChange={handleChange}
                disabled={!sellerInfoEditable}
                className={`block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${!sellerInfoEditable ? 'bg-gray-50 text-gray-700' : 'bg-white'}`}
                placeholder="IR followed by 24 digits"
                pattern="^IR\d{24}$"
                title="IBAN must be in the format of IR followed by 24 digits"
              />
              <p className="mt-1 text-xs text-gray-500">Format: IR followed by 24 digits</p>
            </div>

            {/* Name on Card */}
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <label htmlFor="nameOnCard" className="block text-sm font-medium text-gray-700 mb-1">
                Name on Card
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                required
                value={formData.nameOnCard || ''}
                onChange={handleChange}
                disabled={!sellerInfoEditable}
                className={`block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${!sellerInfoEditable ? 'bg-gray-50 text-gray-700' : 'bg-white'}`}
                placeholder="Name on Card"
              />
            </div>

            {/* Phone Number */}
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                required
                value={formData.phoneNumber || ''}
                onChange={handleChange}
                disabled={!sellerInfoEditable}
                className={`block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${!sellerInfoEditable ? 'bg-gray-50 text-gray-700' : 'bg-white'}`}
                placeholder="Phone Number"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment details section */}
      <div className="bg-emerald-100 p-6 border border-emerald-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-emerald-700 mb-5 border-b border-emerald-200 pb-2">
          Payment Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Game Name - New Field */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <label htmlFor="game" className="block text-sm font-medium text-gray-700 mb-1">
              Game Name
            </label>
            <input
              type="text"
              id="game"
              name="game"
              required
              value={formData.game || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter game name"
            />
          </div>

          {/* Amount */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="text"
              id="amount"
              name="amount"
              required
              autoComplete="off"
              value={formData.amount || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Payment amount"
            />
          </div>

          {/* Price */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              type="text"
              id="price"
              name="price"
              required
              autoComplete="off"
              value={formData.price || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Price per unit"
            />
          </div>

          {/* Total in Rial (Read-only) */}
          <div className="bg-yellow-50 p-3 rounded-md shadow-sm border border-yellow-200">
            <label htmlFor="totalRial" className="block text-sm font-medium text-gray-700 mb-1">
              Total (Rial)
            </label>
            <input
              type="text"
              id="totalRial"
              name="totalRial"
              readOnly
              value={formData.totalRial || ''}
              className="block w-full rounded-md border-gray-300 bg-yellow-50 font-medium text-gray-900 text-lg"
              placeholder="Calculated automatically"
            />
            <p className="mt-1 text-xs text-gray-600">Amount × Price × 10</p>
          </div>

          {/* Payment Duration */}
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <label htmlFor="paymentDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Duration
            </label>
            <select
              id="paymentDuration"
              name="paymentDuration"
              required
              value={formData.paymentDuration}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="Instant">Instant</option>
              <option value="1 day">1 day</option>
              <option value="1-2 days">1-2 days</option>
              <option value="2-3 days">2-3 days</option>
              <option value="3-5 days">3-5 days</option>
              <option value="5-10 days">5-10 days</option>
            </select>
          </div>

          {/* Note */}
          <div className="md:col-span-2 bg-white p-3 rounded-md shadow-sm border border-gray-200">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              value={formData.note || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Additional notes"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-8">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {initialData ? 'Update Payment' : 'Create Payment'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm; 