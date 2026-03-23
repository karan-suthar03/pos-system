import { Routes, Route, Navigate } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orders" replace />} />
      <Route path="/orders" element={<OrdersPage />} />
    </Routes>
  );
}

export default App;