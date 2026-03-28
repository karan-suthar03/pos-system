import { MENU_ITEMS } from "../data/menuItems";
import { handleMessage } from ".";

const STORAGE_KEY = "counter_dummy_orders_v1";
const DISPLAY_BASE = 101;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let typePrefix = "order.";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function toLineItem(dish, quantity, status = "PENDING") {
  return {
    id: nextId(),
    name: dish.name,
    price: dish.price,
    quantity,
    status,
  };
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function seedOrders() {
  const now = Date.now();
  const findDish = (name) => MENU_ITEMS.find((item) => item.name === name) || MENU_ITEMS[0];

  const order1Items = [
    toLineItem(findDish("Masala Chai"), 2, "SERVED"),
    toLineItem(findDish("Veg Grilled Sandwich"), 1, "PENDING"),
  ];

  const order2Items = [
    toLineItem(findDish("Peri Peri Fries"), 1, "PENDING"),
    toLineItem(findDish("Classic Cold Coffee"), 2, "PENDING"),
  ];

  const order3Items = [
    toLineItem(findDish("Margherita"), 1, "SERVED"),
    toLineItem(findDish("Mineral Water"), 2, "SERVED"),
  ];

  return [
    {
      id: 1,
      displayId: DISPLAY_BASE,
      tag: "Table 3",
      status: "ACTIVE",
      items: order1Items,
      orderTotal: computeTotal(order1Items),
      paymentDone: false,
      createdAt: new Date(now - 11 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      displayId: DISPLAY_BASE + 1,
      tag: "Takeaway",
      status: "ACTIVE",
      items: order2Items,
      orderTotal: computeTotal(order2Items),
      paymentDone: false,
      createdAt: new Date(now - 6 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      displayId: DISPLAY_BASE + 2,
      tag: "Table 6",
      status: "CLOSED",
      items: order3Items,
      orderTotal: computeTotal(order3Items),
      paymentDone: true,
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
  ];
}

function readOrders() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedOrders();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid order store format");
    return parsed;
  } catch {
    const seeded = seedOrders();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function findOrderIndex(orders, orderId) {
  return orders.findIndex((order) => Number(order.id) === Number(orderId));
}

async function getOrders() {
  await sleep(120);
  const orders = readOrders();
  return clone(orders.sort((a, b) => b.id - a.id));
}

async function createOrder(order) {
  if (window.NativeApi?.handleMessage) {
    try {
      let result = await handleMessage({
        type: `${typePrefix}createOrder`,
        params: { order },
      });

      console.log("Create order result:", result);
    } catch (_error) {

    }
  }
}

async function closeOrder(orderId) {
  await sleep(100);
  const orders = readOrders();
  const index = findOrderIndex(orders, orderId);
  if (index === -1) return null;

  orders[index].status = "CLOSED";
  writeOrders(orders);
  return clone(orders[index]);
}

async function toggleServedStatus(orderId, itemId) {
  await sleep(80);
  const orders = readOrders();
  const index = findOrderIndex(orders, orderId);
  if (index === -1) return { status: "PENDING" };

  const order = orders[index];
  const item = order.items.find((entry) => Number(entry.id) === Number(itemId));
  if (!item) return { status: "PENDING" };

  item.status = item.status === "SERVED" ? "PENDING" : "SERVED";
  writeOrders(orders);
  return { status: item.status };
}

async function deleteItemFromOrder(itemId) {
  await sleep(80);
  const orders = readOrders();

  for (const order of orders) {
    const originalLength = order.items.length;
    order.items = order.items.filter((item) => Number(item.id) !== Number(itemId));
    if (order.items.length !== originalLength) {
      order.orderTotal = computeTotal(order.items);
      break;
    }
  }

  writeOrders(orders);
  return { success: true };
}

async function toggleOrderPayment(orderId) {
  await sleep(80);
  const orders = readOrders();
  const index = findOrderIndex(orders, orderId);
  if (index === -1) return { isPaymentDone: false };

  orders[index].paymentDone = !orders[index].paymentDone;
  writeOrders(orders);
  return { isPaymentDone: orders[index].paymentDone };
}

async function cancelOrder(orderId) {
  await sleep(90);
  const orders = readOrders().filter((order) => Number(order.id) !== Number(orderId));
  writeOrders(orders);
  return { success: true };
}

export {
  getOrders,
  createOrder,
  closeOrder,
  toggleServedStatus,
  deleteItemFromOrder,
  toggleOrderPayment,
  cancelOrder,
};
