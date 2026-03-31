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

export { getCategories };
