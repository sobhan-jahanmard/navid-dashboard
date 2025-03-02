import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';

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

interface GoldPaymentsTableProps {
  goldPayments: GoldPayment[];
  isLoading: boolean;
  timeframeFilter?: string;
  onTimeframeFilterChange?: (value: string) => void;
}

export default function GoldPaymentsTable({ 
  goldPayments, 
  isLoading, 
  timeframeFilter = 'all',
  onTimeframeFilterChange
}: GoldPaymentsTableProps) {
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discordIdFilter, setDiscordIdFilter] = useState<string>('');
  const [filteredPayments, setFilteredPayments] = useState<GoldPayment[]>(goldPayments);

  // Apply filters whenever goldPayments or discordIdFilter changes
  useEffect(() => {
    if (discordIdFilter) {
      setFilteredPayments(goldPayments.filter(payment => 
        payment.discordId && 
        payment.discordId.toLowerCase().includes(discordIdFilter.toLowerCase())
      ));
    } else {
      setFilteredPayments(goldPayments);
    }
  }, [goldPayments, discordIdFilter]);

  // Toggle expanded view
  const toggleExpand = (id: string) => {
    console.log('Toggling expansion for payment:', id);
    setExpandedPayment(expandedPayment === id ? null : id);
  };

  // Handle Discord ID filter change
  const handleDiscordIdFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscordIdFilter(e.target.value);
  };

  // Clear filter function
  const clearFilter = () => {
    setDiscordIdFilter('');
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
  
  // Update gold payment status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!session?.user) return;
    
    try {
      setUpdatingStatus(id);
      setError(null);
      
      const response = await fetch(`/api/gold-payments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update gold payment status');
      }
      
      console.log(`Gold payment ${id} status updated to ${newStatus}`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating gold payment status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Gold Payments</h3>
        <p className="mt-1 text-sm text-gray-500">Game currency transactions and gold sales</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      
      {/* Timeframe filter for gold payments */}
      {onTimeframeFilterChange && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div>
            <label htmlFor="gold-timeframe-filter" className="block text-sm font-medium text-gray-700 mb-1">Submission Time</label>
            <select
              id="gold-timeframe-filter"
              value={timeframeFilter}
              onChange={(e) => onTimeframeFilterChange(e.target.value)}
              className="w-full md:w-64 p-2 border border-gray-300 rounded-md"
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
        </div>
      )}
      
      {/* Add Discord ID filter */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="w-full sm:w-auto">
            <label htmlFor="discordIdFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Discord ID
            </label>
            <input
              type="text"
              id="discordIdFilter"
              value={discordIdFilter}
              onChange={handleDiscordIdFilterChange}
              placeholder="Enter Discord ID"
              className="p-2 border border-gray-300 rounded-md w-full"
            />
          </div>
          
          <button 
            onClick={clearFilter}
            className="mt-auto px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm"
          >
            Clear Filter
          </button>
          
          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredPayments.length} of {goldPayments.length} payments
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discord ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name-Realm</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who Paid</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  {discordIdFilter ? "No gold payments found with this Discord ID." : "No gold payments found."}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <React.Fragment key={payment.id}>
                  <tr className={`
                    ${payment.status === 'Paid' ? 'bg-green-50' : 
                    payment.status === 'Cancelled' ? 'bg-red-50' : ''} 
                    cursor-pointer hover:bg-gray-50
                  `}
                  onClick={() => {
                    console.log('Row clicked for payment:', payment.id);
                    toggleExpand(payment.id);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleExpand(payment.id);
                      e.preventDefault();
                    }
                  }}
                  aria-expanded={expandedPayment === payment.id}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.discordId || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                      <div className="text-sm text-gray-900">{payment.nameRealm}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                      <div className="text-sm text-gray-900">
                        {isNaN(Number(payment.amount)) 
                          ? payment.amount 
                          : Number(payment.amount).toLocaleString('en-US', {
                              style: 'decimal',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.category || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : payment.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.whoPaid || payment.paidBy || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-1">
                        {session?.user?.role === 'SUPPORT' && (
                          <>
                            {payment.status === 'Paid' ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    handleUpdateStatus(payment.id, 'Pending');
                                  }}
                                  disabled={updatingStatus === payment.id}
                                  className="text-white bg-yellow-600 hover:bg-yellow-700 text-xs px-2 py-1 rounded"
                                >
                                  Mark Pending
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    handleUpdateStatus(payment.id, 'Cancelled');
                                  }}
                                  disabled={updatingStatus === payment.id}
                                  className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : payment.status === 'Cancelled' ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    handleUpdateStatus(payment.id, 'Paid');
                                  }}
                                  disabled={updatingStatus === payment.id}
                                  className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    handleUpdateStatus(payment.id, 'Pending');
                                  }}
                                  disabled={updatingStatus === payment.id}
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
                                    handleUpdateStatus(payment.id, 'Paid');
                                  }}
                                  disabled={updatingStatus === payment.id}
                                  className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    handleUpdateStatus(payment.id, 'Cancelled');
                                  }}
                                  disabled={updatingStatus === payment.id}
                                  className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedPayment === payment.id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Payment Details</h4>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">ID:</span> {payment.id}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Discord ID:</span> {payment.discordId}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Payment ID:</span> {payment.paymentId || 'N/A'}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Date:</span> {formatDate(payment.date)}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Additional Info</h4>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Name/Realm:</span> {payment.nameRealm}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Category:</span> {payment.category}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Note:</span> {payment.note || 'N/A'}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Amount:</span> {
                                isNaN(Number(payment.amount)) 
                                  ? payment.amount 
                                  : Number(payment.amount).toLocaleString('en-US', {
                                      style: 'decimal',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0
                                    })
                              }
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Admin Info</h4>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Status:</span> {payment.status || 'Pending'}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Admin:</span> {payment.admin || 'N/A'}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="font-medium">Who Paid:</span> {payment.whoPaid || payment.paidBy || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 