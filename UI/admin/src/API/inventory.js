import { handleMessage } from '.';

const TYPE_PREFIX = 'inventory.';

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function normalizeInventoryItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  return {
    id: toNumber(rawItem.id ?? rawItem.inventoryItemId ?? rawItem.inventory_item_id),
    name: toString(rawItem.name, 'Unnamed item'),
    category: rawItem.category ?? null,
    unit: toString(rawItem.unit, 'unit'),
    onHand: toNumber(rawItem.onHand ?? rawItem.on_hand),
    lowStockThreshold: toNumber(rawItem.lowStockThreshold ?? rawItem.low_stock_threshold),
    maxStock: toNumber(rawItem.maxStock ?? rawItem.max_stock),
    notes: rawItem.notes ?? null,
    createdAt: toNumber(rawItem.createdAt ?? rawItem.created_at),
    updatedAt: toNumber(rawItem.updatedAt ?? rawItem.updated_at),
    deletedAt: rawItem.deletedAt ?? rawItem.deleted_at ?? null,
  };
}

function normalizeMovement(rawMovement) {
  if (!rawMovement || typeof rawMovement !== 'object') {
    return null;
  }

  return {
    id: toNumber(rawMovement.id ?? rawMovement.inventoryMovementId ?? rawMovement.inventory_movement_id),
    inventoryItemId: toNumber(rawMovement.inventoryItemId ?? rawMovement.inventory_item_id),
    delta: toNumber(rawMovement.delta),
    reason: toString(rawMovement.reason, ''),
    refType: rawMovement.refType ?? rawMovement.ref_type ?? null,
    refId: rawMovement.refId ?? rawMovement.ref_id ?? null,
    notes: rawMovement.notes ?? null,
    createdAt: toNumber(rawMovement.createdAt ?? rawMovement.created_at),
    updatedAt: toNumber(rawMovement.updatedAt ?? rawMovement.updated_at),
    deletedAt: rawMovement.deletedAt ?? rawMovement.deleted_at ?? null,
  };
}

function normalizeRecipeItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  return {
    id: toNumber(rawItem.id ?? rawItem.dishIngredientId ?? rawItem.dish_ingredient_id),
    dishId: toNumber(rawItem.dishId ?? rawItem.dish_id),
    inventoryItemId: toNumber(rawItem.inventoryItemId ?? rawItem.inventory_item_id),
    quantity: toNumber(rawItem.quantity),
    createdAt: toNumber(rawItem.createdAt ?? rawItem.created_at),
    updatedAt: toNumber(rawItem.updatedAt ?? rawItem.updated_at),
    deletedAt: rawItem.deletedAt ?? rawItem.deleted_at ?? null,
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

async function listInventoryItems() {
  const data = await sendInventoryRequest(`${TYPE_PREFIX}listItems`);
  return Array.isArray(data) ? data.map((item) => normalizeInventoryItem(item)).filter(Boolean) : [];
}

async function getInventoryItem(itemId) {
  const parsedId = toNumber(itemId);
  if (parsedId <= 0) {
    throw new Error('Invalid inventory item id');
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}getItem`, { inventoryItemId: parsedId });
  const rawItem = data?.item ?? data;
  const normalized = normalizeInventoryItem(rawItem);
  if (!normalized) {
    throw new Error('Inventory item data is unavailable');
  }

  return normalized;
}

async function upsertInventoryItem(payload) {
  const params = {
    inventoryItemId: toNumber(payload?.id ?? payload?.inventoryItemId),
    name: payload?.name,
    category: payload?.category ?? null,
    unit: payload?.unit,
    onHand: payload?.onHand,
    lowStockThreshold: payload?.lowStockThreshold,
    maxStock: payload?.maxStock,
    notes: payload?.notes,
    clearNotes: Boolean(payload?.clearNotes),
  };

  if (!params.inventoryItemId) {
    delete params.inventoryItemId;
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}upsertItem`, params);
  const rawItem = data?.item ?? data;
  const normalized = normalizeInventoryItem(rawItem);
  if (!normalized) {
    throw new Error('Inventory item data is unavailable');
  }

  return normalized;
}

async function deleteInventoryItem(itemId) {
  const parsedId = toNumber(itemId);
  if (parsedId <= 0) {
    throw new Error('Invalid inventory item id');
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}deleteItem`, { inventoryItemId: parsedId });
  return data?.deletedId ?? parsedId;
}

async function adjustInventoryStock(itemId, delta, notes) {
  const parsedId = toNumber(itemId);
  if (parsedId <= 0) {
    throw new Error('Invalid inventory item id');
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}adjustStock`, {
    inventoryItemId: parsedId,
    delta: toNumber(delta),
    notes: notes ?? null,
  });

  const rawMovement = data?.movement ?? data;
  const normalized = normalizeMovement(rawMovement);
  if (!normalized) {
    throw new Error('Inventory movement data is unavailable');
  }

  return normalized;
}

async function listInventoryMovements({ itemId = null, limit = null } = {}) {
  const params = {};
  if (itemId) {
    params.inventoryItemId = toNumber(itemId);
  }
  if (limit) {
    params.limit = toNumber(limit);
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}listMovements`, params);
  return Array.isArray(data) ? data.map((movement) => normalizeMovement(movement)).filter(Boolean) : [];
}

async function listLowStockItems() {
  const data = await sendInventoryRequest(`${TYPE_PREFIX}lowStock`);
  return Array.isArray(data) ? data.map((item) => normalizeInventoryItem(item)).filter(Boolean) : [];
}

async function listRecipe(dishId) {
  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const data = await sendInventoryRequest(`${TYPE_PREFIX}listRecipe`, { dishId: parsedId });
  return Array.isArray(data) ? data.map((item) => normalizeRecipeItem(item)).filter(Boolean) : [];
}

async function setRecipe(dishId, items = []) {
  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const payloadItems = Array.isArray(items)
    ? items.map((item) => ({
        inventoryItemId: toNumber(item?.inventoryItemId ?? item?.itemId),
        quantity: toNumber(item?.quantity),
      }))
    : [];

  const data = await sendInventoryRequest(`${TYPE_PREFIX}setRecipe`, {
    dishId: parsedId,
    items: payloadItems,
  });

  return Array.isArray(data) ? data.map((item) => normalizeRecipeItem(item)).filter(Boolean) : [];
}

export {
  listInventoryItems,
  getInventoryItem,
  upsertInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
  listInventoryMovements,
  listLowStockItems,
  listRecipe,
  setRecipe,
};
