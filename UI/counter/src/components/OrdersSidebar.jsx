import {
	AlertCircle,
	ChevronRight,
	Clock,
	CreditCard,
	Hourglass,
	FileText,
	Menu,
	ReceiptIndianRupeeIcon,
	Search,
	Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatOrderTime, toTimestampMs } from '../utils/dateTime';

function OrderListCard({ order, isSelected, getOrderTotal }) {
	const createdAtMs = toTimestampMs(order.createdAt);
	const orderAgeMinutes = Math.max(
		0,
		Math.floor((Date.now() - createdAtMs) / 60000),
	);
	const orderLabel = order.tag || order.displayId || order.id;
	const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
	const pendingItems = order.items.filter((item) => item.status !== 'SERVED').length;
	const total = getOrderTotal(order);
	const isOpen = order.status === 'OPEN';
	const isClosed = order.status === 'CLOSED';
	const isCancelled = order.status === 'CANCELLED';

	let cardClasses = 'bg-white/60 border-slate-200/60 backdrop-blur-sm';
	let textMainColor = 'text-slate-800';
	let textSubColor = 'text-slate-400';
	let badgeClass = 'bg-emerald-100/80 text-emerald-700';
	let TimerIcon = Clock;

	if (isSelected) {
		if (isClosed) {
			cardClasses = 'bg-slate-100/80 border-slate-300 shadow-md transform scale-[1.02]';
			textSubColor = 'text-slate-500';
		} else if (isCancelled) {
			cardClasses = 'bg-red-50/80 border-red-200 shadow-sm transform scale-[1.02]';
			textMainColor = 'text-red-800';
			textSubColor = 'text-red-600';
		} else if (orderAgeMinutes >= 15) {
			cardClasses = 'bg-red-500 border-red-600 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)] transform scale-[1.02]';
			textMainColor = 'text-white';
			textSubColor = 'text-red-100';
			badgeClass = 'bg-white/20 text-white';
			TimerIcon = AlertCircle;
		} else if (orderAgeMinutes >= 10) {
			cardClasses = 'bg-orange-500 border-orange-600 shadow-[0_8px_20px_-6px_rgba(249,115,22,0.5)] transform scale-[1.02]';
			textMainColor = 'text-white';
			textSubColor = 'text-orange-50';
			badgeClass = 'bg-white/20 text-white';
			TimerIcon = Hourglass;
		} else {
			cardClasses = 'bg-emerald-600 border-emerald-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] transform scale-[1.02]';
			textMainColor = 'text-white';
			textSubColor = 'text-emerald-100';
			badgeClass = 'bg-white/20 text-white';
		}
	} else if (isOpen) {
		if (orderAgeMinutes >= 15) {
			cardClasses = 'bg-red-50/50 border-red-200 hover:bg-red-50/80';
			textSubColor = 'text-red-600';
			badgeClass = 'bg-red-100/80 text-red-700';
			TimerIcon = AlertCircle;
		} else if (orderAgeMinutes >= 10) {
			cardClasses = 'bg-orange-50/50 border-orange-200 hover:bg-orange-50/80';
			textSubColor = 'text-orange-600';
			badgeClass = 'bg-orange-100/80 text-orange-700';
			TimerIcon = Hourglass;
		} else {
			cardClasses = 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/60';
			textSubColor = 'text-emerald-600';
			badgeClass = 'bg-emerald-100/80 text-emerald-700';
		}
	} else if (isCancelled) {
		cardClasses = 'bg-slate-50/50 border-slate-200 hover:bg-slate-50';
		textSubColor = 'text-slate-500';
	}

	return (
		<div className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-md ${cardClasses}`}>
			<div className="flex justify-between items-start mb-2">
				<div className="flex items-center gap-2">
					<span className={`text-sm font-bold tracking-tight ${textMainColor}`}>#{orderLabel}</span>
					{isClosed && (
						<span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">Closed</span>
					)}
					{isCancelled && (
						<span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-red-100/80 text-red-600 border border-red-200/50">Cancelled</span>
					)}
				</div>

				{!isOpen ? (
					<span className={`text-xs font-medium ${textSubColor}`}>{formatOrderTime(order.createdAt)}</span>
				) : (
					<div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${badgeClass}`}>
						<TimerIcon size={12} strokeWidth={2.5} />
						<span>{orderAgeMinutes}m</span>
					</div>
				)}
			</div>

			<div className="flex justify-between items-end">
				<div className="flex flex-wrap items-center gap-2">
					<span className={`text-xs font-semibold ${textSubColor}`}>{itemCount} items</span>
					{isOpen && pendingItems > 0 && (
						<div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100/80 text-orange-700 border border-orange-200/50">
							<Utensils size={10} strokeWidth={2.5} />
							{pendingItems} Left
						</div>
					)}
					{order.paymentDone && (
						<div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
							<CreditCard size={10} strokeWidth={2.5} />
							Paid
						</div>
					)}
				</div>
				<span className={`text-lg font-black tracking-tighter ${textMainColor}`}>₹{(total / 100).toFixed(2)}</span>
			</div>

			{isSelected && <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 drop-shadow-md" size={32} />}
		</div>
	);
}

function OrdersSidebar({
	orders,
	selectedOrderId,
	onSelectOrder,
	getOrderTotal,
	draftCount = 0,
	onViewDrafts,
	autoPayEnabled,
	onToggleAutoPay,
}) {
	const [searchQuery, setSearchQuery] = useState('');
	const [filterStatus, setFilterStatus] = useState('active');

	const visibleOrders = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();

		return orders.filter((order) => {
			if (order.status === 'CANCELLED') {
				return false;
			}

			const orderLabel = `${order.tag || ''} ${order.displayId || ''} ${order.id || ''}`.toLowerCase();
			const matchesSearch = normalizedSearch.length === 0 || orderLabel.includes(normalizedSearch);
			if (!matchesSearch) {
				return false;
			}

			if (filterStatus === 'active') {
				return order.status === 'OPEN';
			}

			if (filterStatus === 'closed') {
				return order.status === 'CLOSED';
			}

			return true;
		});
	}, [orders, searchQuery, filterStatus]);

	return (
		<aside className="w-full lg:w-87.5 bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col shrink-0">
			<div className="px-5 py-4 border-b border-slate-200/50 bg-transparent z-10">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
						<ReceiptIndianRupeeIcon size={18} className="text-slate-700" strokeWidth={2.5} />
						Orders List
					</h2>
					<button
						onClick={onToggleAutoPay}
						className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
							autoPayEnabled
								? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 shadow-sm'
								: 'bg-slate-50/80 border-slate-200 text-slate-600 shadow-sm hover:bg-slate-100'
						}`}
						title={autoPayEnabled ? 'Auto pay enabled' : 'Auto pay disabled'}
					>
						<div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${autoPayEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
							<div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${autoPayEnabled ? 'right-0.5' : 'left-0.5'}`} />
						</div>
						<CreditCard size={14} strokeWidth={2.5} />
					</button>
				</div>

				<div className="relative mb-3 group">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={16} />
					<input
						type="text"
						placeholder="Search orders..."
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10 rounded-xl text-sm font-medium transition-all outline-none"
					/>
				</div>

				<div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/60 shadow-inner">
					{['active', 'closed', 'all'].map((tab) => (
						<button
							key={tab}
							onClick={() => setFilterStatus(tab)}
							className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
								filterStatus === tab
									? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'
									: 'text-slate-500 hover:text-slate-700 hover:bg-white/60 cursor-pointer'
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				{draftCount > 0 && (
					<div className="mt-3">
						<button
							onClick={onViewDrafts}
							className="w-full flex items-center justify-between bg-linear-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/70 hover:border-amber-300 shadow-sm text-slate-700 px-4 py-2.5 rounded-xl transition-all group cursor-pointer hover:shadow-md"
						>
							<div className="flex items-center gap-2">
								<FileText size={16} className="text-slate-600" strokeWidth={2.4} />
								<span className="text-sm font-bold">Saved Drafts</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="bg-amber-200/70 text-slate-700 text-xs font-black px-2 py-1 rounded-md">{draftCount}</span>
								<ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
							</div>
						</button>
					</div>
				)}
			</div>

			<div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
				{visibleOrders.length === 0 && (
					<div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
						<div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-2">
							<Menu size={22} className="opacity-60" />
						</div>
						<p className="font-medium">No orders found</p>
					</div>
				)}
				{visibleOrders.map((order) => (
					<div key={order.id} onClick={() => onSelectOrder?.(order.id)}>
						<OrderListCard order={order} isSelected={order.id === selectedOrderId} getOrderTotal={getOrderTotal} />
					</div>
				))}
			</div>
		</aside>
	);
}

export default OrdersSidebar;
