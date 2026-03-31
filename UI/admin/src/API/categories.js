import { handleMessage } from '.';

const TYPE_PREFIX = 'category.';

function normalizeCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== 'object') {
    return null;
  }

  return {
    id: Number(rawCategory.id ?? rawCategory.category_id) || 0,
    name: rawCategory.name || rawCategory.category || '',
    imagePath: rawCategory.imagePath ?? rawCategory.image_path ?? null,
    imageUrl: rawCategory.imageUrl ?? rawCategory.image_url ?? null,
    updatedAt: Number(rawCategory.updatedAt ?? rawCategory.updated_at) || 0,
  };
}

async function getCategories() {
  if (!window.NativeApi?.handleMessage) {
    return null;
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}list`,
    params: null,
  });

  if (!result || !result.success || !Array.isArray(result.data)) {
    return null;
  }

  return result.data.map((category) => normalizeCategory(category)).filter(Boolean);
}

async function upsertCategory({ name, imagePath, clearImage = false }) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const payload = {
    name: String(name || '').trim(),
    imagePath: imagePath ?? undefined,
    clearImage: Boolean(clearImage),
  };

  const result = await handleMessage({
    type: `${TYPE_PREFIX}upsert`,
    params: payload,
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to update category');
  }

  const category = normalizeCategory(result.data.category ?? result.data);
  if (!category) {
    throw new Error('Category data is unavailable');
  }

  return category;
}

async function setCategoryImage({ id, name, imagePath, clearImage = false }) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const payload = {
    categoryId: id ? Number(id) : undefined,
    name: name ? String(name).trim() : undefined,
    imagePath: imagePath ?? undefined,
    clearImage: Boolean(clearImage),
  };

  const result = await handleMessage({
    type: `${TYPE_PREFIX}setImage`,
    params: payload,
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to update category image');
  }

  const category = normalizeCategory(result.data.category ?? result.data);
  if (!category) {
    throw new Error('Category data is unavailable');
  }

  return category;
}

export { getCategories, upsertCategory, setCategoryImage };
