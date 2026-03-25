const catalog = {
  "Hot Beverage": [
    ["Masala Chai", 3500],
    ["Cappuccino", 5500],
    ["Hot Chocolate", 6500],
  ],
  "Cold Coffee": [
    ["Classic Cold Coffee", 9000],
    ["Hazelnut Cold Coffee", 10500],
  ],
  "Refresher": [
    ["Lemon Mint Cooler", 7000],
    ["Virgin Mojito", 8500],
  ],
  "Smoothie": [
    ["Mango Smoothie", 11000],
    ["Berry Smoothie", 12000],
  ],
  Shake: [
    ["Chocolate Shake", 10000],
    ["KitKat Shake", 12500],
  ],
  Sandwich: [
    ["Veg Grilled Sandwich", 8500],
    ["Paneer Club Sandwich", 10500],
  ],
  Maggi: [
    ["Classic Masala Maggi", 6000],
    ["Cheese Maggi", 7500],
  ],
  Pasta: [
    ["White Sauce Pasta", 12500],
    ["Arrabiata Pasta", 11500],
  ],
  Fries: [
    ["Salted Fries", 7000],
    ["Peri Peri Fries", 8000],
  ],
  Pizza: [
    ["Margherita", 14000],
    ["Farmhouse", 17500],
  ],
  Burger: [
    ["Aloo Tikki Burger", 9000],
    ["Paneer Burger", 12000],
  ],
  Momo: [
    ["Steamed Veg Momo", 8500],
    ["Fried Chicken Momo", 11500],
  ],
  Extra: [
    ["Cheese Slice", 3000],
    ["Extra Dip", 2000],
  ],
  Misc: [
    ["Mineral Water", 2500],
    ["Packing Charge", 1000],
  ],
};

let nextDishId = 1;

export const DISHES_BY_CATEGORY = Object.fromEntries(
  Object.entries(catalog).map(([category, dishes]) => [
    category,
    dishes.map(([name, price]) => ({
      id: nextDishId++,
      name,
      price,
      category,
    })),
  ]),
);

export const MENU_ITEMS = Object.values(DISHES_BY_CATEGORY).flat();
