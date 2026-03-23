import { DISHES_BY_CATEGORY } from "../data/menuItems";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function getDishes() {
  await sleep(120);
  return clone(DISHES_BY_CATEGORY);
}

export { getDishes };