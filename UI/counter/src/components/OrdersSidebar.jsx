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

function OrderListCard({ order, isSelected, getOrderTotal }) {
	const orderAgeMinutes = Math.max(
		0,
		Math.floor((Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 60000),
	);
	const orderLabel = order.tag || order.displayId || order.id;
	const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
	const pendingItems = order.items.filter((item) => item.status !== 'SERVED').length;
	const total = getOrderTotal(order);

	let cardClasses = 'bg-white border-gray-200';
	let textMainColor = 'text-gray-900';
	let textSubColor = 'text-gray-400';
	let badgeClass = 'bg-emerald-100 text-emerald-700';
	let TimerIcon = Clock;

	if (isSelected) {
		if (order.status === 'CLOSED') {
			cardClasses = 'bg-[#F3F4F6] border-green-700 shadow-lg';
			textSubColor = 'text-gray-500';
		} else if (orderAgeMinutes >= 15) {
			cardClasses = 'bg-red-600 border-red-700 shadow-md shadow-red-200';
			textMainColor = 'text-white';
			textSubColor = 'text-red-100';
			badgeClass = 'bg-white/20 text-white';
			TimerIcon = AlertCircle;
		} else if (orderAgeMinutes >= 10) {
			cardClasses = 'bg-orange-500 border-orange-600 shadow-md shadow-orange-200';
			textMainColor = 'text-white';
			textSubColor = 'text-orange-50';
			badgeClass = 'bg-white/20 text-white';
			TimerIcon = Hourglass;
		} else {
			cardClasses = 'bg-emerald-600 border-emerald-600 shadow-md shadow-emerald-200';
			textMainColor = 'text-white';
			textSubColor = 'text-emerald-50';
			badgeClass = 'bg-white/20 text-white';
		}
	} else if (order.status !== 'CLOSED') {
		if (orderAgeMinutes >= 15) {
			cardClasses = 'bg-red-50 border-red-300 shadow-sm';
			textSubColor = 'text-red-600';
			badgeClass = 'bg-red-100 text-red-700';
			TimerIcon = AlertCircle;
		} else if (orderAgeMinutes >= 10) {
			cardClasses = 'bg-orange-50 border-orange-200';
			textSubColor = 'text-orange-600';
			badgeClass = 'bg-orange-100 text-orange-700';
			TimerIcon = Hourglass;
		} else {
			cardClasses = 'bg-emerald-50/50 border-emerald-200';
			textSubColor = 'text-emerald-700';
			badgeClass = 'bg-emerald-100 text-emerald-700';
		}
	}

	return (
		<div className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md ${cardClasses}`}>
			<div className="flex justify-between items-start mb-2">
				<div className="flex items-center gap-2">
					<span className={`text-sm font-bold ${textMainColor}`}>#{orderLabel}</span>
					{order.status === 'CLOSED' && (
						<span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">Closed</span>
					)}
				</div>

				{order.status === 'CLOSED' ? (
					<span className={`text-xs ${textSubColor}`}>25 Mar, 05:30 PM</span>
				) : (
					<div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
						<TimerIcon size={12} />
						<span>{orderAgeMinutes}m</span>
					</div>
				)}
			</div>

			<div className="flex justify-between items-end">
				<div className="flex flex-wrap items-center gap-2">
					<span className={`text-xs ${textSubColor}`}>{itemCount} items</span>
					{order.status !== 'CLOSED' && pendingItems > 0 && (
						<div className="flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
							<Utensils size={10} />
							{pendingItems} Left
						</div>
					)}
					{order.paymentDone && (
						<div className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
							<CreditCard size={10} />
							Paid
						</div>
					)}
				</div>
				<span className={`text-lg font-black ${textMainColor}`}>₹{(total / 100).toFixed(2)}</span>
			</div>

			{isSelected && <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20" size={40} />}
		</div>
	);
}

function OrdersSidebar({ orders, selectedOrderId, onSelectOrder, getOrderTotal, draftCount = 0, onViewDrafts }) {
	return (
		<aside className="w-full lg:w-87.5 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col shrink-0">
			<div className="px-5 py-4 border-b border-gray-100 bg-white z-10">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
						<ReceiptIndianRupeeIcon size={18} className="text-blue-600" />
						Orders List
					</h2>
					<button className="lg:hidden p-2 bg-gray-100 rounded-full">
						<Menu size={18} />
					</button>
				</div>

				<div className="relative mb-3 group">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
					<input
						type="text"
						placeholder="Search orders..."
						className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
						readOnly
					/>
				</div>

				<div className="flex bg-gray-100/50 p-1 rounded-lg">
					<button className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md bg-white text-blue-600 shadow-sm">active</button>
					<button className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md text-gray-500">closed</button>
					<button className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md text-gray-500">all</button>
				</div>

				{draftCount > 0 && (
					<div className="mt-3">
						<button
							onClick={onViewDrafts}
							className="w-full flex items-center justify-between bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300 shadow-sm text-amber-800 px-4 py-2.5 rounded-xl transition-all group cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<FileText size={16} className="text-amber-600" />
								<span className="text-sm font-bold">Saved Drafts</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="bg-amber-200/70 text-amber-800 text-xs font-black px-2 py-1 rounded-md">{draftCount}</span>
								<ChevronRight size={16} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
							</div>
						</button>
					</div>
				)}
			</div>

			<div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-50/30">
				{orders.map((order) => (
					<div key={order.id} onClick={() => onSelectOrder?.(order.id)}>
						<OrderListCard order={order} isSelected={order.id === selectedOrderId} getOrderTotal={getOrderTotal} />
					</div>
				))}
			</div>
		</aside>
	);
}

export default OrdersSidebar;
