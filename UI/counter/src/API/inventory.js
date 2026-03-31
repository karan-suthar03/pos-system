import { handleMessage } from '.';

const TYPE_PREFIX = 'inventory.';

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeInventoryItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  return {
    id: toNumber(rawItem.id ?? rawItem.inventoryItemId ?? rawItem.inventory_item_id),
    name: rawItem.name ?? 'Unnamed item',
    category: rawItem.category ?? null,
    unit: rawItem.unit ?? 'unit',
    onHand: toNumber(rawItem.onHand ?? rawItem.on_hand),
    lowStockThreshold: toNumber(rawItem.lowStockThreshold ?? rawItem.low_stock_threshold),
    maxStock: toNumber(rawItem.maxStock ?? rawItem.max_stock),
  };
}

async function sendInventoryRequest(type, params = null) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const result = await handleMessage({
    type,
    params,
  });

  if (!result?.success) {
    throw new Error(result?.error || `Inventory request failed: ${type}`);
  }

  return result.data;
}

async function listLowStockItems() {
  const data = await sendInventoryRequest(`${TYPE_PREFIX}lowStock`);
  return Array.isArray(data) ? data.map((item) => normalizeInventoryItem(item)).filter(Boolean) : [];
}

export { listLowStockItems };
