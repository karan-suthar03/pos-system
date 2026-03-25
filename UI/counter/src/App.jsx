import { useState } from 'react';
import CounterHeader from './components/CounterHeader';
import StatsBar from './components/StatsBar';
import OrdersSidebar from './components/OrdersSidebar';
import OrderDetailsPanel from './components/OrderDetailsPanel';
import CreateOrderPopup from './components/CreateOrderPopup';

const ORDERS = [
  {
    id: 104,
    tag: 'Table 4',
    status: 'ACTIVE',
    minutes: 17,
    paymentDone: false,
    items: [
      { id: 1, name: 'Classic Cold Coffee', quantity: 2, price: 9000, status: 'PENDING' },
      { id: 2, name: 'Peri Peri Fries', quantity: 1, price: 8000, status: 'SERVED' },
    ],
  },
  {
    id: 103,
    tag: 'Takeaway',
    status: 'ACTIVE',
    minutes: 9,
    paymentDone: false,
    items: [
      { id: 3, name: 'Margherita', quantity: 1, price: 14000, status: 'PENDING' },
    ],
  },
  {
    id: 102,
    tag: 'Table 2',
    status: 'CLOSED',
    minutes: 0,
    paymentDone: true,
    items: [
      { id: 4, name: 'Masala Chai', quantity: 2, price: 3500, status: 'SERVED' },
      { id: 5, name: 'Veg Grilled Sandwich', quantity: 1, price: 8500, status: 'SERVED' },
    ],
  },
];

const SELECTED_ORDER_ID = 104;

function getOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function getStats() {
  const active = ORDERS.filter((order) => order.status !== 'CLOSED').length;
  const closed = ORDERS.filter((order) => order.status === 'CLOSED').length;
  const revenue = ORDERS
    .filter((order) => order.paymentDone)
    .reduce((sum, order) => sum + getOrderTotal(order), 0);
  return { active, closed, revenue };
}


function App() {
  const [showCreateOrderPopup, setShowCreateOrderPopup] = useState(false);
  const stats = getStats();
  const selectedOrder = ORDERS.find((order) => order.id === SELECTED_ORDER_ID) || ORDERS[0];

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans text-slate-900">
      <CounterHeader />
      <StatsBar stats={stats} onCreateOrder={() => setShowCreateOrderPopup(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row w-full flex-1 gap-6 h-[calc(100vh-180px)]">
        <OrdersSidebar
          orders={ORDERS}
          selectedOrderId={selectedOrder.id}
          getOrderTotal={getOrderTotal}
        />
        <OrderDetailsPanel order={selectedOrder} getOrderTotal={getOrderTotal} />
      </main>

      <CreateOrderPopup
        isOpen={showCreateOrderPopup}
        onClose={() => setShowCreateOrderPopup(false)}
      />
    </div>
  );
}

export default App;