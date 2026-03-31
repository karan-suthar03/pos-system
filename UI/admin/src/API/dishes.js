import { handleMessage } from '.';

const TYPE_PREFIX = 'dish.';

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeDish(rawDish, categoryFallback = 'Other') {
  if (!rawDish || typeof rawDish !== 'object') {
    return null;
  }

  const isAvailableValue = rawDish.isAvailable ?? rawDish.is_available;

  return {
    id: toNumber(rawDish.id ?? rawDish.dish_id),
    name: rawDish.name ?? rawDish.dish_name ?? 'Unnamed dish',
    category: rawDish.category ?? rawDish.dish_category ?? categoryFallback ?? 'Other',
    categoryId: toNumber(rawDish.categoryId ?? rawDish.category_id),
    price: toNumber(rawDish.price ?? rawDish.dish_price),
    isAvailable: typeof isAvailableValue === 'boolean' ? isAvailableValue : Boolean(isAvailableValue ?? true),
    updatedAt: toNumber(rawDish.updatedAt ?? rawDish.updated_at),
  };
}

function flattenDishes(rawDishes) {
  if (!rawDishes || typeof rawDishes !== 'object') {
    return [];
  }

  const rows = [];
  Object.entries(rawDishes).forEach(([category, dishes]) => {
    if (!Array.isArray(dishes)) {
      return;
    }

    dishes.forEach((dish) => {
      const normalized = normalizeDish(dish, category);
      if (normalized && normalized.id > 0) {
        rows.push(normalized);
      }
    });
  });

  return rows;
}

async function getDishes() {
  if (!window.NativeApi?.handleMessage) {
    return null;
  }

  try {
    const result = await handleMessage({
      type: `${TYPE_PREFIX}getDishes`,
      params: null,
    });

    if (result && result.success && result.data) {
      return result.data;
    }
  } catch (_error) {
    // Swallow to keep UI resilient to bridge errors.
  }

  return null;
}

async function getDishList() {
  const grouped = await getDishes();
  return flattenDishes(grouped);
}

async function getDishById(dishId) {
  if (!window.NativeApi?.handleMessage) {
    return null;
  }

  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}getDishById`,
    params: {
      dishId: parsedId,
    },
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to fetch dish');
  }

  const rawDish = result.data.dish ?? result.data;
  const normalized = normalizeDish(rawDish);
  if (!normalized) {
    throw new Error('Dish data is unavailable');
  }

  return normalized;
}

async function createDish({ name, category, price, isAvailable = true }) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const payload = {
    name: String(name || '').trim(),
    category: String(category || '').trim(),
    price: toNumber(price),
    isAvailable: Boolean(isAvailable),
  };

  const result = await handleMessage({
    type: `${TYPE_PREFIX}create`,
    params: payload,
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to create dish');
  }

  const rawDish = result.data.dish ?? result.data;
  const normalized = normalizeDish(rawDish, payload.category);
  if (!normalized) {
    throw new Error('Dish data is unavailable');
  }

  return normalized;
}

async function updateDish(dishId, { name, category, price, isAvailable }) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const payload = {
    dishId: parsedId,
    name: String(name || '').trim(),
    category: String(category || '').trim(),
    price: toNumber(price),
    isAvailable: typeof isAvailable === 'boolean' ? isAvailable : undefined,
  };

  const result = await handleMessage({
    type: `${TYPE_PREFIX}update`,
    params: payload,
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to update dish');
  }

  const rawDish = result.data.dish ?? result.data;
  const normalized = normalizeDish(rawDish, payload.category);
  if (!normalized) {
    throw new Error('Dish data is unavailable');
  }

  return normalized;
}

async function setDishAvailability(dishId, isAvailable) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}setAvailability`,
    params: {
      dishId: parsedId,
      isAvailable: Boolean(isAvailable),
    },
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to update availability');
  }

  const rawDish = result.data.dish ?? result.data;
  const normalized = normalizeDish(rawDish);
  if (!normalized) {
    throw new Error('Dish data is unavailable');
  }

  return normalized;
}

async function deleteDish(dishId) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const parsedId = toNumber(dishId);
  if (parsedId <= 0) {
    throw new Error('Invalid dish id');
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}delete`,
    params: {
      dishId: parsedId,
    },
  });

  if (!result || !result.success) {
    throw new Error(result?.error || 'Failed to delete dish');
  }

  return true;
}

export {
  getDishes,
  getDishList,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  setDishAvailability,
  normalizeDish,
};