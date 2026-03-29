import { handleMessage } from ".";

let typePrefix = "analytics.";

async function getAnalytics(range) {
    if (window.NativeApi?.handleMessage) {
        try {
            const result = await handleMessage({
                type: `${typePrefix}getAnalytics`,
                params: { range },
            });

            if (result && result.success && result.data) {
                return result.data; 
            }
        } catch (_error) {

        }
    }
}

async function getDishPerformance(range, type = "revenue", limit = 5) {
  if (window.NativeApi?.handleMessage) {
    try {
      const result = await handleMessage({
        type: `${typePrefix}getDishPerformance`,
        params: {
          range,
          type,
          limit,
        },
      });

      if (result && result.success && Array.isArray(result.data)) {
        return result.data;
      }
    } catch (_error) {

    }
  }
}

async function getCategoryPerformance(range) {
  if (window.NativeApi?.handleMessage) {
    try {
      const result = await handleMessage({
        type: `${typePrefix}getCategoryPerformance`,
        params: { range },
      });

      if (result && result.success && Array.isArray(result.data)) {
        return result.data;
      }
    } catch (_error) {

    }
  }
}

export { getAnalytics, getDishPerformance, getCategoryPerformance };