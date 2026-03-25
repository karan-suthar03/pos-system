import { DISHES_BY_CATEGORY } from "../data/menuItems";
import { handleMessage } from ".";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let typePrefix = "dish.";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

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