'use client';

import React, { useState, useEffect, cache, Suspense, lazy, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInHours, isPast, isToday } from 'date-fns';
import { sortPaymentsByPaidStatus } from '@/lib/payment-utils';
import Button from '@/components/ui/Button';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import components with loading fallbacks
const Sidebar = dynamic(() => import('@/components/Sidebar'), {
  loading: () => <div className="w-64 bg-gradient-to-b from-indigo-900 to-blue-800"></div>,
  ssr: false
});

const UserInfo = dynamic(() => import('@/components/UserInfo'), {
  loading: () => <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>,
  ssr: false
});

const GoldPaymentsTable = dynamic(() => import('@/components/GoldPaymentsTable'), {
  loading: () => <div className="bg-white p-4 rounded-lg shadow">Loading gold payments...</div>,
  ssr: false
});

// Create a lightweight loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
  </div>
);

// Create a cached version of the fetch payments function
const fetchPaymentsData = cache(async () => {
  try {
    const response = await fetch('/api/payments', {
      // Add cache: 'no-store' to get fresh data each time 
      // or use cache: 'force-cache' for longer caching
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
});

// Create a cached version of the fetch gold payments function
const fetchGoldPaymentsData = cache(async () => {
  try {
    const response = await fetch('/api/gold-payments', {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch gold payments');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching gold payments:', error);
    return [];
  }
});

interface Payment {
  _id?: string;
  id?: string; // Handle both MongoDB _id and Google Sheets id
  amount?: number | string;
  price?: number | string;
  finalAmount?: number | string; // New field
  user?: string;
  submitDate?: string; // Renamed from timestamp
  discordId?: string;
  cardNumber?: string; // Renamed from shomare_kart
  iban?: string; // Renamed from shomare_sheba
  name?: string;
  phone?: string; // Renamed from shomare_tamas
  paymentDuration?: string | number;
  game?: string;
  note?: string;
  status?: string;
  whoPaidCancelled?: string; // Who paid or cancelled the payment
  
  // Adding new properties from googleSheetsHelper
  nameOnCard?: string;
  phoneNumber?: string;
  
  // Adding back fields still used in the code
  timestamp?: string; // Keeping for backward compatibility
  dueDate?: string; // Keeping for backward compatibility
  paid?: boolean; // Keeping for backward compatibility
  totalRial?: number | string; // Keeping for backward compatibility
  admin?: string; // Keeping for backward compatibility
}

interface GoldPayment {
  id: string;
  date: string;
  discordId: string;
  nameRealm: string; // Name-Realm field
  amount: string;
  note: string;
  category: string;
  admin: string;
  paymentId: string; // New field
  status: string;
  whoPaid: string; // Renamed from paidBy
  paidBy?: string; // For backward compatibility
}

// Define sort options
type SortField = 'dueDate' | 'amount' | 'game' | 'timestamp' | 'status';
type SortDirection = 'asc' | 'desc';

// Define a debounce utility function to reduce repeated fetch calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [goldPayments, setGoldPayments] = useState<GoldPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGold, setIsLoadingGold] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<Payment | null>(null);
  
  // Add filter state
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'pending', 'active', 'cancelled'
    dueDate: 'all', // 'all', 'overdue', 'upcoming', 'thisWeek', 'thisMonth'
    timeframe: 'all', // 'all', 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'
    discordId: '', // New field for Discord ID filtering
  });
  
  // Add sort state
  const [sort, setSort] = useState<{field: SortField, direction: SortDirection}>({
    field: 'dueDate',
    direction: 'asc'
  });
  
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  
  // Add state for gold payments filter
  const [goldPaymentsTimeframe, setGoldPaymentsTimeframe] = useState('all');
  const [filteredGoldPayments, setFilteredGoldPayments] = useState<GoldPayment[]>([]);
  
  // Track which section is active
  const [activeSection, setActiveSection] = useState<'payments' | 'gold'>('payments');

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    // Fetch payments if authenticated
    if (status === 'authenticated') {
      fetchPayments();
      fetchGoldPayments();
      
      // Check for hash in URL to determine active section
      const hash = window.location.hash;
      if (hash === '#gold') {
        setActiveSection('gold');
      } else {
        setActiveSection('payments');
      }
      
      // Listen for hash changes
      const handleHashChange = () => {
        const newHash = window.location.hash;
        if (newHash === '#gold') {
          setActiveSection('gold');
        } else if (newHash === '#payments' || newHash === '') {
          setActiveSection('payments');
        }
      };
      
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, [status, router]);

  // Update the useEffect to apply filters and sort whenever filters or sort state changes
  useEffect(() => {
    if (allPayments.length > 0) {
      applyFiltersAndSort();
    }
  }, [filters, sort, allPayments]);

  // Add useEffect to filter gold payments by timeframe
  useEffect(() => {
    if (goldPayments.length > 0) {
      setFilteredGoldPayments(filterGoldPaymentsByTimeframe(goldPayments, goldPaymentsTimeframe));
    }
  }, [goldPayments, goldPaymentsTimeframe]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Starting to fetch payments...");
      const data = await fetchPaymentsData();
      
      console.log("📊 Raw data from API:", data);
      
      // Check if data is an array
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.log("⚠️ Received empty array from API");
        } else {
          console.log(`✅ Received ${data.length} payments from API`);
        }
        
        // Store all payments
        setAllPayments(data);
        // Initialize filtered payments with all payments
        setPayments(data);
        console.log("💾 Updated payments state:", data);
      } else {
        console.error('⛔ Expected array of payments but received:', data);
        setAllPayments([]);
        setPayments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      setError('Error loading payments. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch gold payments
  const fetchGoldPayments = async () => {
    try {
      setIsLoadingGold(true);
      console.log("🔍 Starting to fetch gold payments...");
      const data = await fetchGoldPaymentsData();
      
      console.log("📊 Raw gold payment data from API:", data);
      
      // Check if data is an array
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.log("⚠️ Received empty gold payments array from API");
        } else {
          console.log(`✅ Received ${data.length} gold payments from API`);
        }
        
        // Filter out empty gold payments (missing essential fields)
        const filteredGoldPayments = data.filter(payment => 
          payment.nameRealm && payment.amount && payment.category
        );
        
        console.log(`✂️ Filtered out ${data.length - filteredGoldPayments.length} empty gold payments`);
        
        // Store gold payments
        setGoldPayments(filteredGoldPayments);
        console.log("💾 Updated gold payments state:", filteredGoldPayments);
      } else {
        console.error('⛔ Expected array of gold payments but received:', data);
        setGoldPayments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching gold payments:', error);
      setError('Error loading gold payments. Please try again later.');
    } finally {
      setIsLoadingGold(false);
    }
  };

  // Add function to filter gold payments by timeframe
  const filterGoldPaymentsByTimeframe = (payments: GoldPayment[], timeframe: string) => {
    if (timeframe === 'all') return payments;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(thisMonthStart.getMonth() - 1);
    
    return payments.filter(payment => {
      if (!payment.date) return false;
      
      let paymentDate;
      
      // Check if it's in European format (DD/MM/YYYY)
      if (typeof payment.date === 'string' && payment.date.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [day, month, year] = payment.date.split('/').map(part => parseInt(part, 10));
        paymentDate = new Date(year, month - 1, day);
      } else {
        // Try standard format
        paymentDate = new Date(payment.date);
      }
      
      // Return false if we couldn't parse the date
      if (isNaN(paymentDate.getTime())) return false;
      
      switch (timeframe) {
        case 'today':
          return paymentDate >= today && paymentDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case 'yesterday':
          return paymentDate >= yesterday && paymentDate < today;
        case 'thisWeek':
          return paymentDate >= thisWeekStart;
        case 'lastWeek':
          return paymentDate >= lastWeekStart && paymentDate < thisWeekStart;
        case 'thisMonth':
          return paymentDate >= thisMonthStart;
        case 'lastMonth':
          return paymentDate >= lastMonthStart && paymentDate < thisMonthStart;
        default:
          return true;
      }
    });
  };

  // Memoize filter and sort functions to reduce recalculations
  const applyFiltersAndSort = useCallback(() => {
    if (!allPayments.length) return;
    
    let filteredPayments = [...allPayments];
    
    // Filter by Discord ID
    if (filters.discordId) {
      filteredPayments = filteredPayments.filter(payment => 
        payment.discordId && 
        payment.discordId.toLowerCase().includes(filters.discordId.toLowerCase())
      );
    }
    
    // Filter by status
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        // Active = not cancelled and not pending
        filteredPayments = filteredPayments.filter(payment => {
          const paymentStatus = payment.status?.toLowerCase();
          return paymentStatus !== 'cancelled' && paymentStatus !== 'pending';
        });
      } else {
        // Filter by exact status
        filteredPayments = filteredPayments.filter(payment => {
          const paymentStatus = payment.status?.toLowerCase() || (payment.paid ? 'paid' : 'pending');
          return paymentStatus === filters.status.toLowerCase();
        });
      }
    }
    
    // Filter by due date
    if (filters.dueDate !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekFromNow = new Date(today);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      const oneMonthFromNow = new Date(today);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      filteredPayments = filteredPayments.filter(payment => {
        if (!payment.dueDate) return false;
        
        // Parse the due date properly based on format
        let dueDate;
        
        // Check if it's in European format (DD/MM/YYYY)
        if (typeof payment.dueDate === 'string' && payment.dueDate.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const [day, month, year] = payment.dueDate.split('/').map(part => parseInt(part, 10));
          dueDate = new Date(year, month - 1, day);
        } else {
          // Try standard format
          dueDate = new Date(payment.dueDate);
        }
        
        // Return false if we couldn't parse the date
        if (isNaN(dueDate.getTime())) return false;
        
        switch (filters.dueDate) {
          case 'overdue':
            return dueDate < today && (payment.status?.toLowerCase() !== 'paid' && !payment.paid);
          case 'today':
            return dueDate.getDate() === today.getDate() && 
                   dueDate.getMonth() === today.getMonth() && 
                   dueDate.getFullYear() === today.getFullYear();
          case 'thisWeek':
            return dueDate >= today && dueDate <= oneWeekFromNow;
          case 'thisMonth':
            return dueDate >= today && dueDate <= oneMonthFromNow;
          default:
            return true;
        }
      });
    }
    
    // Filter by submission timeframe
    if (filters.timeframe !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
      
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const lastMonthStart = new Date(thisMonthStart);
      lastMonthStart.setMonth(thisMonthStart.getMonth() - 1);
      
      filteredPayments = filteredPayments.filter(payment => {
        // Use submitDate if available, otherwise fall back to timestamp
        const dateString = payment.submitDate || payment.timestamp;
        if (!dateString) return false;
        
        // Parse the submission date properly based on format
        let submissionDate;
        
        // Check if it's in European format (DD/MM/YYYY)
        if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          // Extract date part if there's a time component
          const [datePart] = dateString.split(' ');
          const [day, month, year] = datePart.split('/').map(part => parseInt(part, 10));
          
          submissionDate = new Date(year, month - 1, day);
          
          // Handle time part if present
          const timePart = dateString.split(' ')[1];
          if (timePart) {
            const [hours, minutes, seconds] = timePart.split(':').map(t => parseInt(t, 10));
            if (!isNaN(hours)) submissionDate.setHours(hours);
            if (!isNaN(minutes)) submissionDate.setMinutes(minutes);
            if (!isNaN(seconds)) submissionDate.setSeconds(seconds);
          }
        } else {
          // Try standard format
          submissionDate = new Date(dateString);
        }
        
        // Return false if we couldn't parse the date
        if (isNaN(submissionDate.getTime())) return false;
        
        switch (filters.timeframe) {
          case 'today':
            return submissionDate >= today && submissionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          case 'yesterday':
            return submissionDate >= yesterday && submissionDate < today;
          case 'thisWeek':
            return submissionDate >= thisWeekStart;
          case 'lastWeek':
            return submissionDate >= lastWeekStart && submissionDate < thisWeekStart;
          case 'thisMonth':
            return submissionDate >= thisMonthStart;
          case 'lastMonth':
            return submissionDate >= lastMonthStart && submissionDate < thisMonthStart;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    const sortedPayments = sortPayments(filteredPayments, sort.field, sort.direction);
    
    setPayments(sortedPayments);
  }, [filters, sort, allPayments]);

  // Debounced version of fetch to reduce API calls
  const debouncedFetchPayments = useCallback(
    debounce(() => {
      fetchPayments();
    }, 300),
    []
  );

  const debouncedFetchGoldPayments = useCallback(
    debounce(() => {
      fetchGoldPayments();
    }, 300),
    []
  );

  // Memoize filtered gold payments
  const memoizedFilteredGoldPayments = useMemo(() => {
    return filterGoldPaymentsByTimeframe(goldPayments, goldPaymentsTimeframe);
  }, [goldPayments, goldPaymentsTimeframe]);

  // Handle filter changes
  const handleFilterChange = (filterType: 'status' | 'dueDate' | 'timeframe' | 'discordId', value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle sort changes
  const handleSortChange = (field: SortField) => {
    setSort(prev => {
      // If same field, toggle direction
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // New field, default to ascending
      return {
        field,
        direction: 'asc'
      };
    });
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/edit/${id}`);
  };

  const handleTogglePaid = async (id: string, newStatus: string) => {
    if (newStatus === 'Cancelled' && !window.confirm('Are you sure you want to cancel this payment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment');
      }
      
      const updatedPayment = await response.json();
      
      // Update all payments state
      setAllPayments(prevPayments => {
        const newPayments = prevPayments.map(payment => 
          (payment._id || payment.id) === id ? updatedPayment : payment
        );
        return newPayments;
      });
      
      // Also update the filtered payments state to reflect changes immediately
      setPayments(prevPayments => {
        const newPayments = prevPayments.map(payment => 
          (payment._id || payment.id) === id ? updatedPayment : payment
        );
        return newPayments;
      });
      
      // Show success message
      console.log(`Payment ${id} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating payment:', err);
      setError('Error updating payment. Please try again later.');
    }
  };

  const toggleExpand = (payment: Payment) => {
    console.log('Toggling expansion for payment:', payment.id || payment._id);
    setExpandedPayment(expandedPayment === payment ? null : payment);
  };
  
  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      // Check if it's already in European format (DD/MM/YYYY)
      if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        // It's already in the correct format, just return it
        // Optionally trim the time part if present
        return dateString.split(' ')[0];
      }
      
      // Otherwise parse and format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      // Explicitly format as DD/MM/YYYY for European format
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time helper
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      // Check if it's in European format (DD/MM/YYYY)
      let date;
      if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        // Extract any time portion if it exists
        const timePart = dateString.split(' ')[1];
        if (!timePart) return ''; // No time part available
        
        // Extract day, month, year
        const [datePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/').map(part => parseInt(part, 10));
        
        // If we have a time part, parse and format it
        if (timePart) {
          // Create date with correct components
          date = new Date(year, month - 1, day);
          
          // Parse time part (assumes HH:MM:SS format)
          const [hours, minutes, seconds] = timePart.split(':').map(t => parseInt(t, 10));
          if (!isNaN(hours)) date.setHours(hours);
          if (!isNaN(minutes)) date.setMinutes(minutes);
          if (!isNaN(seconds)) date.setSeconds(seconds);
        } else {
          // No time part, use midnight
          date = new Date(year, month - 1, day);
        }
      } else {
        // Standard format
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return '';
      
      // Format time in 24-hour format with leading zeros
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false // Use 24-hour format
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };
  
  // Get time remaining or overdue
  const getTimeStatus = (dateString?: string, isPaid: boolean = false, status?: string) => {
    // Don't show time status for paid or cancelled payments
    if (!dateString || isPaid || status === 'Cancelled' || status === 'Paid') return null;
    
    try {
      // Parse the date properly based on format
      let dueDate;
      
      // Check if it's in European format (DD/MM/YYYY)
      if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [day, month, year] = dateString.split('/').map(part => parseInt(part, 10));
        // Create date with correct day, month (0-indexed), year
        dueDate = new Date(year, month - 1, day);
        
        // Set the time to end of day (23:59:59)
        dueDate.setHours(23, 59, 59, 999);
      } else {
        // Try standard format, but still set to end of day
        dueDate = new Date(dateString);
        dueDate.setHours(23, 59, 59, 999);
      }
      
      if (isNaN(dueDate.getTime())) return null;
      
      const now = new Date();
      const isPastDue = isPast(dueDate) && !isToday(dueDate);
      
      // Calculate hours difference
      const hoursDiff = Math.abs(differenceInHours(dueDate, now));
      
      // Format time in a more readable way
      let formattedTime;
      if (hoursDiff > 48) {
        const days = Math.floor(hoursDiff / 24);
        const remainingHours = hoursDiff % 24;
        formattedTime = `${days} days and ${remainingHours} hours`;
      } else {
        formattedTime = `${hoursDiff} hours`;
      }
      
      if (isPastDue) {
        // Past due
        return {
          text: `Overdue by ${formattedTime}`,
          isOverdue: true
        };
      } else {
        // Due in future
        return {
          text: `${formattedTime} remaining`,
          isOverdue: false
        };
      }
    } catch (error) {
      console.error('Error calculating time status:', error);
      return null;
    }
  };
  
  // Helper to get payment ID
  const getPaymentId = (payment: Payment): string => {
    // If _id or id exists, use it
    if (payment._id) return payment._id;
    if (payment.id) return payment.id;
    
    // Otherwise create a unique identifier using available data
    // Concatenate multiple fields to create a unique string
    const uniqueFields = [
      payment.discordId,
      payment.submitDate || payment.timestamp,
      payment.game,
      payment.amount
    ].filter(Boolean).join('_');
    
    // If we have some data to create a unique ID, use it
    if (uniqueFields) return `generated_${uniqueFields}`;
    
    // Last resort: create a random ID (should rarely happen)
    return `random_${Math.random().toString(36).substring(2, 15)}`;
  };
  
  // Helper to determine payment status
  const getPaymentStatus = (payment: Payment): string => {
    if (payment.status) return payment.status;
    if (payment.paid) return 'Paid';
    return 'Pending';
  };
  
  // Helper to determine payment amount
  const getPaymentAmount = (payment: Payment): string => {
    if (payment.totalRial) return String(payment.totalRial);
    if (payment.amount) return String(payment.amount);
    return 'N/A';
  };

  // Helper to determine due date if it's missing
  const getDueDate = (payment: Payment): string => {
    // Just return the dueDate property if it exists, no calculation needed
    if (payment.dueDate) return payment.dueDate;
    
    // If no dueDate property exists, return N/A
    return 'N/A';
  };

  // Helper to format amount for display
  const formatAmount = (payment: Payment): string => {
    const amount = getPaymentAmount(payment);
    return amount !== 'N/A' 
      ? Number(amount).toLocaleString('en-US', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
      : 'N/A';
  };

  // Helper to format any numeric value
  const formatNumericValue = (value?: number | string): string => {
    if (value === undefined || value === null) return 'N/A';
    
    // Handle formatted strings by removing non-numeric characters (except decimal points)
    let cleanValue = value;
    if (typeof value === 'string') {
      // First check if it's already a formatted number like #,##0
      if (value.includes(',')) {
        // Just ensure it's displayed with the proper formatting
        const numbersOnly = value.replace(/[^\d,.-]/g, '');
        const parts = numbersOnly.split(',');
        // If it's a proper formatted number, return as is with proper formatting
        if (parts.length > 1) {
          return numbersOnly;
        }
      }
      
      // Remove any commas, spaces, and currency symbols, but keep decimal points
      cleanValue = value.replace(/[^\d.-]/g, '');
      
      // If the string is empty after cleanup, return N/A
      if (!cleanValue) return 'N/A';
    }
    
    // Try to parse the value as a number
    const numValue = Number(cleanValue);
    
    // Check if the result is a valid number
    if (isNaN(numValue)) return 'N/A';
    
    return numValue.toLocaleString('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Sort payments by the given field and direction
  const sortPayments = (payments: Payment[], field: SortField, direction: SortDirection) => {
    return [...payments].sort((a, b) => {
      let comparison = 0;
      
      switch (field) {
        case 'dueDate':
          // Parse and convert dates to timestamps for comparison
          const dueDateA = a.dueDate ? parseDate(a.dueDate).getTime() : 0;
          const dueDateB = b.dueDate ? parseDate(b.dueDate).getTime() : 0;
          comparison = dueDateA - dueDateB;
          break;
          
        case 'amount':
          // Convert amounts to numbers
          const amountA = a.amount ? Number(a.amount) : 0;
          const amountB = b.amount ? Number(b.amount) : 0;
          comparison = amountA - amountB;
          break;
          
        case 'game':
          // Compare game strings
          comparison = (a.game || '').localeCompare(b.game || '');
          break;
          
        case 'timestamp':
          // Parse and compare creation timestamps
          const timestampA = (a.submitDate || a.timestamp) ? parseDate(a.submitDate || a.timestamp).getTime() : 0;
          const timestampB = (b.submitDate || b.timestamp) ? parseDate(b.submitDate || b.timestamp).getTime() : 0;
          comparison = timestampA - timestampB;
          break;
          
        case 'status':
          // Compare status strings
          comparison = getPaymentStatus(a).localeCompare(getPaymentStatus(b));
          break;
      }
      
      // Apply direction modifier
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  // Helper function to parse dates in different formats
  const parseDate = (dateString?: string): Date => {
    if (!dateString) return new Date(0);
    
    try {
      // Check if it's in European format (DD/MM/YYYY)
      if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        // Extract date part if there's a time component
        const [datePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/').map(part => parseInt(part, 10));
        
        const date = new Date(year, month - 1, day);
        
        // Handle time part if present
        const timePart = dateString.split(' ')[1];
        if (timePart) {
          const [hours, minutes, seconds] = timePart.split(':').map(t => parseInt(t, 10));
          if (!isNaN(hours)) date.setHours(hours);
          if (!isNaN(minutes)) date.setMinutes(minutes);
          if (!isNaN(seconds)) date.setSeconds(seconds);
        }
        
        return date;
      }
      
      // Try standard format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return new Date(0);
      
      return date;
    } catch (error) {
      console.error('Error parsing date:', error, dateString);
      return new Date(0);
    }
  };

  // Update the handleGoldPaymentsTimeframeChange function
  const handleGoldPaymentsTimeframeChange = (timeframe: string) => {
    setGoldPaymentsTimeframe(timeframe);
  };

  // Add a function to toggle expanded payment
  const toggleExpandPayment = (payment: Payment | null) => {
    setExpandedPayment(expandedPayment === payment ? null : payment);
  };

  if (status === 'loading' || (isLoading && isLoadingGold)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-100">
      <Suspense fallback={<div className="w-64 bg-gradient-to-b from-indigo-900 to-blue-800"></div>}>
        <Sidebar />
      </Suspense>
      
      <main className="flex-1 p-2 md:p-4 lg:p-6 overflow-auto ml-0 md:ml-32 mt-16 md:mt-0 main-content w-full">
        {error && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <div className="text-red-500">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        )}
        
        <div className="flex flex-wrap items-center justify-between mb-4 md:mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Dashboard</h1>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                debouncedFetchPayments();
                debouncedFetchGoldPayments();
              }}
              className="bg-gray-500 hover:bg-gray-600 shadow"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Section tabs */}
        <div className="bg-white shadow rounded-lg p-2 flex mb-4 md:mb-6">
          <button 
            onClick={() => {
              setActiveSection('payments');
              window.location.hash = 'payments';
            }}
            className={`flex-1 py-2 px-2 md:px-4 text-center rounded text-sm md:text-base ${
              activeSection === 'payments' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            Regular Payments
          </button>
          <button 
            onClick={() => {
              setActiveSection('gold');
              window.location.hash = 'gold';
            }}
            className={`flex-1 py-2 px-2 md:px-4 text-center rounded text-sm md:text-base ${
              activeSection === 'gold' 
                ? 'bg-yellow-500 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            Gold Payments
          </button>
        </div>
        
        {activeSection === 'payments' && (
          <section className="payments-section w-full max-w-none">
            {/* Filter Section */}
            <div className="bg-white p-3 md:p-4 rounded-lg shadow mb-4 md:mb-6 w-full">
              <h2 className="text-lg font-semibold mb-3">Filter & Sort Payments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <label htmlFor="filter-discord" className="block text-sm font-medium text-gray-700 mb-1">Discord ID</label>
                  <input
                    id="filter-discord"
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Search by Discord ID"
                    value={filters.discordId}
                    onChange={(e) => handleFilterChange('discordId', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="filter-status"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">All Payments</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <select
                    value={filters.dueDate}
                    onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Due Dates</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due Today</option>
                    <option value="thisWeek">Due This Week</option>
                    <option value="thisMonth">Due This Month</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">
                    Timeframe
                  </label>
                  <select
                    id="timeframe"
                    name="timeframe"
                    value={filters.timeframe}
                    onChange={(e) => handleFilterChange('timeframe', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisWeek">This Week</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={`${sort.field}-${sort.direction}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                      setSort({ field, direction });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="dueDate-asc">Due Date (Earliest First)</option>
                    <option value="dueDate-desc">Due Date (Latest First)</option>
                    <option value="amount-asc">Amount (Low to High)</option>
                    <option value="amount-desc">Amount (High to Low)</option>
                    <option value="timestamp-desc">Submission Date (Newest First)</option>
                    <option value="timestamp-asc">Submission Date (Oldest First)</option>
                    <option value="game-asc">Game (A-Z)</option>
                    <option value="game-desc">Game (Z-A)</option>
                    <option value="status-asc">Status (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden mb-4 md:mb-6 w-full">
              <div className="px-3 md:px-5 py-4 md:py-5 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    <a href="https://discord.gg/Zjweus8Kdx" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                      Celestial Shop
                    </a>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Updates every 15 minutes!
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Submit Date
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Discord ID
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Price
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                        Final Amount
                        (Rial)                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Game
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Payment Duration
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Due Date
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-left">
                          Who Paid/Cancelled
                        </th>
                        <th scope="col" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-6 py-4 text-center text-gray-500">
                            No payments found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => {
                          const isPaid = payment.paid || payment.status === 'Paid';
                          const isCancelled = payment.status === 'Cancelled';
                          const timeStatus = getTimeStatus(getDueDate(payment), isPaid, payment.status);
                          
                          return (
                            <React.Fragment key={getPaymentId(payment)}>
                              <tr 
                                className={`${isPaid ? 'bg-green-50' : isCancelled ? 'bg-red-50' : ''} cursor-pointer hover:bg-gray-50`}
                                tabIndex={0}
                                onClick={() => {
                                  console.log('Row clicked for payment:', getPaymentId(payment));
                                  toggleExpand(payment);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    toggleExpand(payment);
                                    e.preventDefault();
                                  }
                                }}
                                aria-expanded={expandedPayment === payment}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {formatDate(payment.submitDate || payment.timestamp)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTime(payment.submitDate || payment.timestamp)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {payment.discordId || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                                  <div className="text-sm text-gray-900">
                                    {formatAmount(payment)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {formatNumericValue(payment.price)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {payment.finalAmount 
                                      ? formatNumericValue(payment.finalAmount)
                                      : formatNumericValue(payment.totalRial)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {payment.game || 'Unknown Game'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{payment.paymentDuration || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {formatDate(getDueDate(payment))}
                                  </div>
                                  {timeStatus && typeof timeStatus === 'object' ? (
                                    <div className={`text-xs ${timeStatus.isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                                      {timeStatus.text}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    isPaid 
                                      ? 'bg-green-100 text-green-800' 
                                      : payment.status === 'Cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {payment.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {payment.whoPaidCancelled || payment.admin || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <div className="flex flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-1">
                                    {/* Show buttons for all payments with different actions based on status */}
                                    {isPaid ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Pending');
                                          }}
                                          className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                        >
                                          Mark Paid
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Cancelled');
                                          }}
                                          className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : isCancelled ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Paid');
                                          }}
                                          className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                        >
                                          Mark Paid
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Pending');
                                          }}
                                          className="text-white bg-yellow-600 hover:bg-yellow-700 text-xs px-2 py-1 rounded"
                                        >
                                          Mark Pending
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Paid');
                                          }}
                                          className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                        >
                                          Mark Paid
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent row expansion
                                            handleTogglePaid(getPaymentId(payment), 'Cancelled');
                                          }}
                                          className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {expandedPayment === payment && (
                                <tr>
                                  <td colSpan={11} className="px-6 py-4 bg-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">Payment Details</h4>
                                        <div className="mt-2 space-y-2">
                                          <div>
                                            <span className="text-xs text-gray-500">ID:</span>
                                            <p className="text-sm text-gray-900">{getPaymentId(payment)}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Submit Date:</span>
                                            <p className="text-sm text-gray-900">{formatDate(payment.submitDate || payment.timestamp)}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Due Date:</span>
                                            <p className="text-sm text-gray-900">{formatDate(getDueDate(payment))}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Status:</span>
                                            <p className="text-sm text-gray-900">{payment.status || 'Pending'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">User Information</h4>
                                        <div className="mt-2 space-y-2">
                                          <div>
                                            <span className="text-xs text-gray-500">Discord ID:</span>
                                            <p className="text-sm text-gray-900">{payment.discordId || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">User:</span>
                                            <p className="text-sm text-gray-900">{payment.user || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Name:</span>
                                            <p className="text-sm text-gray-900">
                                              {payment.name || (typeof payment.nameOnCard === 'string' ? payment.nameOnCard : '') || 'N/A'}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Phone:</span>
                                            <p className="text-sm text-gray-900">
                                              {payment.phone || (typeof payment.phoneNumber === 'string' ? payment.phoneNumber : '') || 'N/A'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">Bank Information</h4>
                                        <div className="mt-2 space-y-2">
                                          <div>
                                            <span className="text-xs text-gray-500">Card Number:</span>
                                            <p className="text-sm text-gray-900">{payment.cardNumber || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">IBAN:</span>
                                            <p className="text-sm text-gray-900">{payment.iban || 'N/A'}
                                              {payment.iban && (
                                                <button
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(payment.iban || '');
                                                    // Optional: Show a small success message or toast
                                                    alert('IBAN copied to clipboard!');
                                                  }}
                                                  className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                                                  title="Copy IBAN"
                                                >
                                                  Copy
                                                </button>
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-gray-500">Notes:</span>
                                            <p className="text-sm text-gray-900">{payment.note || 'No notes'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile view of payment details when expanded */}
            <div className="md:hidden">
              {expandedPayment && (
                <div className="my-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-lg mb-2">Payment Details</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Game:</span> {expandedPayment.game || 'N/A'}</div>
                    <div><span className="font-medium">Name:</span> {expandedPayment.name || 'N/A'}</div>
                    <div><span className="font-medium">Discord ID:</span> {expandedPayment.discordId || 'N/A'}</div>
                    <div><span className="font-medium">Phone:</span> {expandedPayment.phone || 'N/A'}</div>
                    <div><span className="font-medium">Card Number:</span> {expandedPayment.cardNumber || 'N/A'}</div>
                    <div><span className="font-medium">IBAN:</span> {expandedPayment.iban || 'N/A'}
                      {expandedPayment.iban && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(expandedPayment.iban || '');
                            alert('IBAN copied to clipboard!');
                          }}
                          className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                          title="Copy IBAN"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    <div><span className="font-medium">Note:</span> {expandedPayment.note || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        
        {activeSection === 'gold' && (
          <section className="gold-payments-section">
            <div className="mt-4">
              <Suspense fallback={<LoadingSpinner />}>
                <GoldPaymentsTable 
                  goldPayments={memoizedFilteredGoldPayments} 
                  isLoading={isLoadingGold} 
                  timeframeFilter={goldPaymentsTimeframe}
                  onTimeframeFilterChange={handleGoldPaymentsTimeframeChange}
                />
              </Suspense>
            </div>
          </section>
        )}
      </main>
    </div>
  );
} 