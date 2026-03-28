import { handleMessage } from ".";

let typePrefix = "dish.";

async function getDishes() {
  if (window.NativeApi?.handleMessage) {
    try {
      const result = await handleMessage({
        type: `${typePrefix}getDishes`,
        params: null,
      });

      if (result && result.success && result.data) {
        return result.data;
      }
    } catch (_error) {

    }
  }
}

export { getDishes };