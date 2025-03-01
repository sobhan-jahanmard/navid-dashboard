'use client';

import React, { useState, useEffect, cache } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInHours, isPast, isToday } from 'date-fns';
import { sortPaymentsByPaidStatus } from '@/lib/payment-utils';
import Button from '@/components/ui/Button';
import UserInfo from '@/components/UserInfo';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import GoldPaymentsTable from '@/components/GoldPaymentsTable';

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
  discordId?: string;
  timestamp?: string;
  paymentTime?: string;
  expectedPaymentDate?: string;
  amount?: number | string;
  price?: number | string;
  gheymat?: number | string;
  game?: string;
  shomare_kart?: string;
  shomare_sheba?: string;
  name?: string;
  shomare_tamas?: string;
  note?: string;
  admin?: string;
  paid?: boolean;
  paidBy?: string;
  whoPaidCancelled?: string; // Who paid or cancelled the payment
  description?: string;
  user?: string;
  date?: string;
  status?: string;
  paymentDuration?: string | number;
  dueDate?: string;
  totalRial?: number | string;
  cardNumber?: string;
  iban?: string;
  nameOnCard?: string;
}

interface GoldPayment {
  id: string;
  date: string;
  discordId: string;
  nameRealm: string;
  amount: string;
  category: string;
  status: string;
  paidBy: string;
}

// Define sort options
type SortField = 'dueDate' | 'amount' | 'game' | 'timestamp' | 'status';
type SortDirection = 'asc' | 'desc';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [goldPayments, setGoldPayments] = useState<GoldPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGold, setIsLoadingGold] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  
  // Add filter state
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'pending', 'active', 'cancelled'
    dueDate: 'all', // 'all', 'overdue', 'upcoming', 'thisWeek', 'thisMonth'
    timeframe: 'all', // 'all', 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'
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
      
      const paymentDate = new Date(payment.date);
      
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

  // Filter and sort logic
  const applyFiltersAndSort = () => {
    if (!allPayments.length) return;
    
    let filteredPayments = [...allPayments];
    
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
        
        const dueDate = new Date(payment.dueDate);
        
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
        if (!payment.timestamp) return false;
        
        const submissionDate = new Date(payment.timestamp);
        
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
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType: 'status' | 'dueDate' | 'timeframe', value: string) => {
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
          status: newStatus,
          paid: newStatus === 'Paid',
          whoPaidCancelled: session?.user?.username || session?.user?.name
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment');
      }
      
      const updatedPayment = await response.json();
      
      // Update the payment in the state
      setAllPayments(prevPayments => {
        const newPayments = prevPayments.map(payment => 
          (payment._id || payment.id) === id ? updatedPayment : payment
        );
        return newPayments;
      });
    } catch (err) {
      setError('Error updating payment. Please try again later.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedPayment(expandedPayment === id ? null : id);
  };
  
  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time helper
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Get time remaining or overdue
  const getTimeStatus = (dateString?: string, isPaid: boolean = false, status?: string) => {
    // Don't show time status for paid or cancelled payments
    if (!dateString || isPaid || status === 'Cancelled' || status === 'Paid') return null;
    
    try {
      const dueDate = new Date(dateString);
      if (isNaN(dueDate.getTime())) return null;
      
      const now = new Date();
      const isPastDue = isPast(dueDate) && !isToday(dueDate);
      
      // Calculate hours difference
      const hoursDiff = Math.abs(differenceInHours(dueDate, now));
      
      if (isPastDue) {
        // Past due
        return {
          text: `Overdue by ${hoursDiff} hours`,
          isOverdue: true
        };
      } else {
        // Due in future
        return {
          text: `${hoursDiff} hours remaining`,
          isOverdue: false
        };
      }
    } catch (error) {
      return null;
    }
  };
  
  // Helper to get payment ID
  const getPaymentId = (payment: Payment): string => {
    return payment._id || payment.id || '';
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

  // Sort payments by the given field and direction
  const sortPayments = (payments: Payment[], field: SortField, direction: SortDirection) => {
    return [...payments].sort((a, b) => {
      let comparison = 0;
      
      switch (field) {
        case 'dueDate':
          // Convert dates to timestamps for comparison
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          comparison = dateA - dateB;
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
          // Compare creation timestamps
          const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
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

  // Update the handleGoldPaymentsTimeframeChange function
  const handleGoldPaymentsTimeframeChange = (timeframe: string) => {
    setGoldPaymentsTimeframe(timeframe);
  };

  if (status === 'loading' || (isLoading && isLoadingGold)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      
      <main className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="text-red-500">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        )}
        
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                fetchPayments();
                fetchGoldPayments();
              }}
              className="bg-gray-500 hover:bg-gray-600 shadow"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Section tabs */}
        <div className="bg-white shadow rounded-lg p-2 flex mb-6">
          <button 
            onClick={() => {
              setActiveSection('payments');
              window.location.hash = 'payments';
            }}
            className={`flex-1 py-2 px-4 text-center rounded ${
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
            className={`flex-1 py-2 px-4 text-center rounded ${
              activeSection === 'gold' 
                ? 'bg-yellow-500 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            Gold Payments
          </button>
        </div>
        
        {activeSection === 'payments' && (
          <>
            {/* Filter Section */}
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">Filter & Sort Payments</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
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

            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    <a href="https://discord.gg/celestial" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                      Celestial Shop
                    </a>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Payment durations: Instant, 1-2 days, 2-3 days, 3-5 days, 5-10 days
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSortChange('game')}
                        >
                          Game {sort.field === 'game' && (sort.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSortChange('amount')}
                        >
                          Total (Rial) {sort.field === 'amount' && (sort.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSortChange('dueDate')}
                        >
                          Due Date {sort.field === 'dueDate' && (sort.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSortChange('status')}
                        >
                          Status {sort.field === 'status' && (sort.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSortChange('timestamp')}
                        >
                          Submitted {sort.field === 'timestamp' && (sort.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            No payments found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => {
                          const isPaid = payment.paid || payment.status === 'Paid';
                          const timeStatus = getTimeStatus(payment.dueDate, isPaid, payment.status);
                          
                          return (
                            <React.Fragment key={getPaymentId(payment)}>
                              <tr className={isPaid ? 'bg-green-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {payment.game || 'Unknown Game'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{payment.user || payment.name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-500">{payment.discordId}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                                  <div className="text-sm text-gray-900">
                                    {getPaymentAmount(payment) !== 'N/A' 
                                      ? Number(getPaymentAmount(payment)).toLocaleString('en-US', {
                                          style: 'decimal',
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0
                                        })
                                      : 'N/A'
                                    }
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                                  <div className="text-sm text-gray-900">
                                    {formatDate(payment.dueDate)}
                                  </div>
                                  {/* Only show time status if payment is not paid */}
                                  {timeStatus && (
                                    <div className={`text-xs ${timeStatus.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                      {timeStatus.text}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    Duration: {payment.paymentDuration}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {session?.user?.role === 'SUPPORT' ? (
                                    <select
                                      value={getPaymentStatus(payment)}
                                      onChange={(e) => handleTogglePaid(getPaymentId(payment), e.target.value)}
                                      className={`px-2 py-1 text-xs font-semibold rounded border ${
                                        getPaymentStatus(payment) === 'Paid'
                                          ? 'bg-green-100 text-green-800 border-green-300'
                                          : getPaymentStatus(payment) === 'Cancelled'
                                            ? 'bg-red-100 text-red-800 border-red-300'
                                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                      }`}
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Paid">Paid</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                  ) : (
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      getPaymentStatus(payment) === 'Paid' 
                                        ? 'bg-green-100 text-green-800' 
                                        : getPaymentStatus(payment) === 'Cancelled'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {getPaymentStatus(payment)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {formatDate(payment.timestamp)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTime(payment.timestamp)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => toggleExpand(getPaymentId(payment))}
                                    >
                                      {expandedPayment === getPaymentId(payment) ? 'Hide' : 'View'}
                                    </Button>
                                    {session?.user?.role === 'SUPPORT' && (
                                      <>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleEdit(getPaymentId(payment))}
                                        >
                                          Edit
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {expandedPayment === getPaymentId(payment) && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">Payment Details</h4>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">ID:</span> {getPaymentId(payment)}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">Amount:</span> {getPaymentAmount(payment)}
                                        </p>
                                        {payment.price && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Price:</span> {payment.price}
                                          </p>
                                        )}
                                        {payment.totalRial && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Total (Rial):</span> {payment.totalRial}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">User Information</h4>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">User:</span> {payment.user || payment.name || 'Unknown'}
                                        </p>
                                        {payment.discordId && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Discord ID:</span> {payment.discordId}
                                          </p>
                                        )}
                                        {payment.nameOnCard && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Name on Card:</span> {payment.nameOnCard}
                                          </p>
                                        )}
                                        {payment.cardNumber && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Card:</span> {payment.cardNumber}
                                          </p>
                                        )}
                                        {payment.iban && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">IBAN:</span> {payment.iban}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-500">Status Information</h4>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">Status:</span> {getPaymentStatus(payment)}
                                        </p>
                                        {session?.user?.role === 'SUPPORT' && payment.whoPaidCancelled && (
                                          <p className="mt-1 text-sm text-gray-900">
                                            <span className="font-medium">Who {payment.status === 'Cancelled' ? 'Cancelled' : 'Paid'}:</span> {payment.whoPaidCancelled}
                                          </p>
                                        )}
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">Created:</span> {formatDate(payment.timestamp)} {formatTime(payment.timestamp)}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">Due Date:</span> {formatDate(payment.dueDate)}
                                          {timeStatus && (
                                            <span className={`ml-2 text-xs ${timeStatus.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                              ({timeStatus.text})
                                            </span>
                                          )}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-900">
                                          <span className="font-medium">Duration:</span> {payment.paymentDuration}
                                        </p>
                                      </div>
                                      {payment.note && (
                                        <div className="md:col-span-3">
                                          <h4 className="text-sm font-medium text-gray-500">Note</h4>
                                          <p className="mt-1 text-sm text-gray-900">{payment.note}</p>
                                        </div>
                                      )}
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
          </>
        )}
        
        {activeSection === 'gold' && (
          <div className="mt-4">
            <GoldPaymentsTable 
              goldPayments={filteredGoldPayments} 
              isLoading={isLoadingGold} 
              timeframeFilter={goldPaymentsTimeframe}
              onTimeframeFilterChange={handleGoldPaymentsTimeframeChange}
            />
          </div>
        )}
      </main>
    </div>
  );
} 