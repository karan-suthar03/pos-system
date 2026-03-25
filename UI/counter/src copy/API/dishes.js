import { DISHES_BY_CATEGORY } from "../data/menuItems";
import { handleMessage } from ".";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function getDishes() {
  if (window.NativeApi?.handleMessage) {
    try {
      const result = await handleMessage({
        type: "GET_DISHES",
        params: null,
      });

      if (result && result.success && result.data) {
        return result.data;
      }
    } catch (_error) {

    }
  }

  await sleep(120);
  return clone(DISHES_BY_CATEGORY);
}

export { getDishes };