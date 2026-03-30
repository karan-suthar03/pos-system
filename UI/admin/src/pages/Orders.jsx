import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOrdersHistory } from '../API/orders.js';

const ITEMS_PER_PAGE = 10;

function formatDateTime(timestamp) {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

function toDateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getStatusClass(status) {
  if (status === 'CLOSED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (status === 'CANCELLED') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function getPaymentClass(paymentDone) {
  return paymentDone
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

function buildPageButtons(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push('left-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('right-ellipsis');
  }

  pages.push(totalPages);
  return pages;
}

function SortIndicator({ active, direction }) {
  if (!active) {
    return <ArrowUpDown size={14} className="text-slate-300" />;
  }

  return direction === 'asc'
    ? <ArrowUp size={14} className="text-amber-600" />
    : <ArrowDown size={14} className="text-amber-600" />;
}

export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      start: toDateInputValue(thirtyDaysAgo),
      end: toDateInputValue(today),
    };
  });

  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setLoading(true);
      setError('');

      try {
        const result = await getOrdersHistory({
          searchQuery,
          dateRange,
          sortConfig,
          currentPage,
          pageSize: ITEMS_PER_PAGE,
        });

        if (!isActive) {
          return;
        }

        setOrders(Array.isArray(result.orders) ? result.orders : []);
        setTotalCount(Number(result.totalCount) || 0);
      } catch (loadError) {
        console.error('Failed to load order history:', loadError);

        if (!isActive) {
          return;
        }

        setOrders([]);
        setTotalCount(0);
        setError('Could not load order history. Please try again.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isActive = false;
    };
  }, [searchQuery, dateRange.start, dateRange.end, sortConfig.key, sortConfig.direction, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)),
    [totalCount]
  );

  const visibleRevenue = useMemo(
    () => orders.reduce((sum, order) => (
      order.orderStatus === 'CANCELLED' ? sum : sum + (Number(order.orderTotal) || 0)
    ), 0),
    [orders]
  );

  const closedCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'CLOSED').length,
    [orders]
  );

  const pageButtons = useMemo(
    () => buildPageButtons(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const nextDirection = prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction: nextDirection };
    });
    setCurrentPage(1);
  };

  const handleDateChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-[0_10px_22px_-12px_rgba(15,23,42,0.85)]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Order History</h1>
                <p className="text-sm text-slate-500">Browse and inspect every ticket with timeline-accurate details.</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-[0.14em]">
              {totalCount} total orders in selected range
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_18px_35px_-30px_rgba(16,185,129,0.65)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700/90">Visible Revenue</p>
                <p className="text-2xl font-black tracking-tight text-emerald-900 mt-1">{formatCurrency(visibleRevenue)}</p>
                <p className="text-xs text-emerald-800/80 mt-2">{closedCount} closed orders on this page</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/90 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <IndianRupee size={20} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/75 backdrop-blur-xl p-4 sm:p-5 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by tag or order id"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none transition-all focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white h-11 px-3 text-sm text-slate-600">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">From</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(event) => handleDateChange('start', event.target.value)}
                  className="bg-transparent outline-none text-slate-700 font-medium"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white h-11 px-3 text-sm text-slate-600">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">To</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(event) => handleDateChange('end', event.target.value)}
                  className="bg-transparent outline-none text-slate-700 font-medium"
                />
                <Calendar size={15} className="text-slate-400" />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl overflow-hidden shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)]">
          {error ? (
            <div className="px-4 sm:px-6 py-3 text-sm font-medium text-rose-700 bg-rose-50 border-b border-rose-100">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-190">
              <thead className="bg-slate-50/80 border-b border-slate-200/80">
                <tr>
                  <th
                    className="text-left px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold cursor-pointer"
                    onClick={() => handleSort('tag')}
                  >
                    <div className="flex items-center gap-2">
                      Order
                      <SortIndicator active={sortConfig.key === 'tag'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      <SortIndicator active={sortConfig.key === 'createdAt'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold">Status</th>
                  <th className="text-left px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold">Payment</th>
                  <th
                    className="text-right px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold cursor-pointer"
                    onClick={() => handleSort('orderTotal')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Total
                      <SortIndicator active={sortConfig.key === 'orderTotal'} direction={sortConfig.direction} />
                    </div>
                  </th>
                  <th className="text-right px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold">Open</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-500 text-sm font-medium">
                      Loading order history...
                    </td>
                  </tr>
                ) : null}

                {!loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-500 text-sm font-medium">
                      No orders found for this filter.
                    </td>
                  </tr>
                ) : null}

                {!loading && orders.length > 0
                  ? orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100/90 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">#{order.id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.displayId ? `Display ${order.displayId}` : 'No display id'}
                          {order.tag ? ` | ${order.tag}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border ${getStatusClass(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border ${getPaymentClass(order.paymentDone)}`}>
                          {order.paymentDone ? 'PAID' : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(order.orderTotal)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/orders/${order.id}`);
                          }}
                          className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50/70 transition-colors"
                          aria-label={`Open order ${order.id}`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                  : null}
              </tbody>
            </table>
          </div>

          {!loading && totalCount > 0 ? (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} orders
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {pageButtons.map((pageButton) => {
                  if (typeof pageButton !== 'number') {
                    return (
                      <span key={pageButton} className="h-8 px-1.5 inline-flex items-center text-slate-400 text-sm">
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={pageButton}
                      type="button"
                      onClick={() => setCurrentPage(pageButton)}
                      className={`h-8 min-w-8 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        currentPage === pageButton
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageButton}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
