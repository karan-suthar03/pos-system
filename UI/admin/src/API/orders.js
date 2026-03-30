import { handleMessage } from '.';

const TYPE_PREFIX = 'order.';

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeOrderItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const normalized = {
    id: toNumber(rawItem.id ?? rawItem.order_item_id),
    orderId: toNumber(rawItem.orderId ?? rawItem.order_id),
    dishId: toNumber(rawItem.dishId ?? rawItem.dish_id),
    name: rawItem.name ?? rawItem.dish_name_snapshot ?? 'Unnamed item',
    price: toNumber(rawItem.price ?? rawItem.price_snapshot),
    quantity: toNumber(rawItem.quantity),
    status: rawItem.status ?? rawItem.item_status ?? 'PENDING',
    updatedAt: toNumber(rawItem.updatedAt ?? rawItem.updated_at),
  };

  return normalized;
}

function normalizeOrder(rawOrder) {
  if (!rawOrder || typeof rawOrder !== 'object') {
    return null;
  }

  return {
    id: toNumber(rawOrder.id ?? rawOrder.order_id),
    displayId: String(rawOrder.orderId ?? rawOrder.display_id ?? rawOrder.id ?? ''),
    tag: rawOrder.tag ?? rawOrder.order_tag ?? null,
    paymentDone: Boolean(rawOrder.paymentDone ?? rawOrder.is_payment_done ?? false),
    orderTotal: toNumber(rawOrder.orderTotal ?? rawOrder.order_total),
    orderStatus: rawOrder.orderStatus ?? rawOrder.order_status ?? 'OPEN',
    createdAt: toNumber(rawOrder.createdAt ?? rawOrder.created_at),
    updatedAt: toNumber(rawOrder.updatedAt ?? rawOrder.updated_at),
    items: Array.isArray(rawOrder.items)
      ? rawOrder.items.map(normalizeOrderItem).filter(Boolean)
      : [],
  };
}

async function sendMutationRequest(type, params) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const result = await handleMessage({
    type,
    params,
  });

  if (!result?.success) {
    throw new Error(result?.error || `Order mutation failed: ${type}`);
  }

  const rawOrder = result?.data?.order ?? result?.data;
  const normalizedOrder = normalizeOrder(rawOrder);
  if (!normalizedOrder) {
    throw new Error('Invalid order data received from bridge');
  }

  return normalizedOrder;
}

async function getOrdersHistory({
  searchQuery = '',
  dateRange = { start: null, end: null },
  sortConfig = { key: 'createdAt', direction: 'desc' },
  currentPage = 1,
  pageSize = 10,
} = {}) {
  if (!window.NativeApi?.handleMessage) {
    return { orders: [], totalCount: 0 };
  }

  try {
    const result = await handleMessage({
      type: `${TYPE_PREFIX}getOrdersHistory`,
      params: {
        searchQuery,
        startDate: dateRange?.start ?? null,
        endDate: dateRange?.end ?? null,
        sortKey: sortConfig?.key ?? 'createdAt',
        sortDirection: sortConfig?.direction ?? 'desc',
        page: Number(currentPage) || 1,
        pageSize: Number(pageSize) || 10,
      },
    });

    if (!result || !result.success || !result.data) {
      return { orders: [], totalCount: 0 };
    }

    const rawOrders = Array.isArray(result.data.orders) ? result.data.orders : [];
    const normalizedOrders = rawOrders.map(normalizeOrder).filter(Boolean);
    const totalCount = Number(result.data.totalCount ?? normalizedOrders.length);

    return {
      orders: normalizedOrders,
      totalCount: Number.isFinite(totalCount) ? totalCount : normalizedOrders.length,
    };
  } catch (error) {
    console.error('Failed to fetch orders history:', error);
    return { orders: [], totalCount: 0 };
  }
}

async function getOrderById(orderId) {
  if (!window.NativeApi?.handleMessage) {
    return null;
  }

  const parsedOrderId = Number(orderId);
  if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
    throw new Error('Invalid order id');
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}getOrderById`,
    params: {
      orderId: parsedOrderId,
    },
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to fetch order details');
  }

  const rawOrder = result.data.order ?? result.data;
  const normalizedOrder = normalizeOrder(rawOrder);

  if (!normalizedOrder) {
    throw new Error('Order data is unavailable');
  }

  return normalizedOrder;
}

async function setOrderStatus(orderId, status) {
  const parsedOrderId = toNumber(orderId);
  if (parsedOrderId <= 0) {
    throw new Error('Invalid order id');
  }

  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (!normalizedStatus) {
    throw new Error('Invalid order status');
  }

  return sendMutationRequest(`${TYPE_PREFIX}setStatus`, {
    orderId: parsedOrderId,
    status: normalizedStatus,
  });
}

async function setOrderPaymentStatus(orderId, paymentDone) {
  const parsedOrderId = toNumber(orderId);
  if (parsedOrderId <= 0) {
    throw new Error('Invalid order id');
  }

  return sendMutationRequest(`${TYPE_PREFIX}setPaymentStatus`, {
    orderId: parsedOrderId,
    paymentDone: Boolean(paymentDone),
  });
}

async function updateOrderTag(orderId, tag) {
  const parsedOrderId = toNumber(orderId);
  if (parsedOrderId <= 0) {
    throw new Error('Invalid order id');
  }

  return sendMutationRequest(`${TYPE_PREFIX}updateTag`, {
    orderId: parsedOrderId,
    tag: tag ?? null,
  });
}

async function addOrderItem(orderId, dishId, quantity = 1) {
  const parsedOrderId = toNumber(orderId);
  const parsedDishId = toNumber(dishId);
  const parsedQuantity = Math.max(1, toNumber(quantity, 1));

  if (parsedOrderId <= 0 || parsedDishId <= 0) {
    throw new Error('Invalid order item payload');
  }

  return sendMutationRequest(`${TYPE_PREFIX}addItem`, {
    orderId: parsedOrderId,
    dishId: parsedDishId,
    quantity: parsedQuantity,
  });
}

async function updateOrderItemQuantity(orderId, orderItemId, quantity) {
  const parsedOrderId = toNumber(orderId);
  const parsedOrderItemId = toNumber(orderItemId);
  const parsedQuantity = Math.max(1, toNumber(quantity, 1));

  if (parsedOrderId <= 0 || parsedOrderItemId <= 0) {
    throw new Error('Invalid item update payload');
  }

  return sendMutationRequest(`${TYPE_PREFIX}updateItemQuantity`, {
    orderId: parsedOrderId,
    orderItemId: parsedOrderItemId,
    quantity: parsedQuantity,
  });
}

async function updateOrderItemStatus(orderId, orderItemId, status) {
  const parsedOrderId = toNumber(orderId);
  const parsedOrderItemId = toNumber(orderItemId);
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (parsedOrderId <= 0 || parsedOrderItemId <= 0 || !normalizedStatus) {
    throw new Error('Invalid item status payload');
  }

  return sendMutationRequest(`${TYPE_PREFIX}updateItemStatus`, {
    orderId: parsedOrderId,
    orderItemId: parsedOrderItemId,
    status: normalizedStatus,
  });
}

async function removeOrderItem(orderId, orderItemId) {
  const parsedOrderId = toNumber(orderId);
  const parsedOrderItemId = toNumber(orderItemId);

  if (parsedOrderId <= 0 || parsedOrderItemId <= 0) {
    throw new Error('Invalid remove item payload');
  }

  return sendMutationRequest(`${TYPE_PREFIX}removeItem`, {
    orderId: parsedOrderId,
    orderItemId: parsedOrderItemId,
  });
}

export {
  getOrdersHistory,
  getOrderById,
  setOrderStatus,
  setOrderPaymentStatus,
  updateOrderTag,
  addOrderItem,
  updateOrderItemQuantity,
  updateOrderItemStatus,
  removeOrderItem,
};
