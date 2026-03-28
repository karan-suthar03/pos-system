import { handleMessage } from '.';

const typePrefix = 'order.';

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeItem(rawItem = {}) {
  return {
    id: toNumber(rawItem.id),
    orderId: toNumber(rawItem.orderId),
    dishId: toNumber(rawItem.dishId),
    quantity: toNumber(rawItem.quantity, 1),
    name: rawItem.name || '',
    price: toNumber(rawItem.price),
    status: rawItem.status || 'PENDING',
    updatedAt: toNumber(rawItem.updatedAt),
  };
}

function normalizeOrder(rawOrder = {}) {
  return {
    id: toNumber(rawOrder.id),
    displayId: rawOrder.orderId ?? rawOrder.displayId ?? rawOrder.id,
    tag: rawOrder.tag || null,
    status: rawOrder.orderStatus || rawOrder.status || 'OPEN',
    paymentDone: Boolean(rawOrder.paymentDone),
    orderTotal: toNumber(rawOrder.orderTotal),
    createdAt: toNumber(rawOrder.createdAt),
    updatedAt: toNumber(rawOrder.updatedAt),
    items: Array.isArray(rawOrder.items) ? rawOrder.items.map((item) => normalizeItem(item)) : [],
  };
}

async function sendOrderRequest(type, params = null) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const result = await handleMessage({
    type,
    params,
  });

  if (!result?.success) {
    const message = result?.error || `Order request failed: ${type}`;
    throw new Error(message);
  }

  return result.data;
}

async function getOrders() {
  const data = await sendOrderRequest(`${typePrefix}getTodaysOrders`, {
    includeCancelled: false,
  });
  return Array.isArray(data) ? data.map((order) => normalizeOrder(order)) : [];
}

async function createOrder(order) {
  const payload = {
    order: {
      tag: order?.tag || null,
      items: Array.isArray(order?.items)
        ? order.items.map((item) => ({
            id: toNumber(item.id),
            quantity: toNumber(item.quantity, 1),
          }))
        : [],
    },
  };

  const data = await sendOrderRequest(`${typePrefix}createOrder`, payload);
  return data?.order ? normalizeOrder(data.order) : null;
}

async function completeOrder(orderId) {
  const data = await sendOrderRequest(`${typePrefix}completeOrder`, { orderId });
  return data?.order ? normalizeOrder(data.order) : null;
}

async function cancelOrder(orderId) {
  const data = await sendOrderRequest(`${typePrefix}cancelOrder`, { orderId });
  return data?.order ? normalizeOrder(data.order) : null;
}

async function setOrderPaymentStatus(orderId, paymentDone) {
  const data = await sendOrderRequest(`${typePrefix}setPaymentStatus`, {
    orderId,
    paymentDone: Boolean(paymentDone),
  });

  return data?.order ? normalizeOrder(data.order) : null;
}

async function toggleOrderPayment(orderId) {
  const data = await sendOrderRequest(`${typePrefix}togglePayment`, { orderId });
  return data?.order ? normalizeOrder(data.order) : null;
}

export {
  getOrders,
  createOrder,
  completeOrder,
  cancelOrder,
  setOrderPaymentStatus,
  toggleOrderPayment,
};
