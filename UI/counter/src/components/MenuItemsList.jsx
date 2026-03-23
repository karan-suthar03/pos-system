function MenuItemsList({ groupedItems, onSelectItem }) {
  return (
    <div className="overflow-y-auto border border-gray-200 rounded-lg bg-white">
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category}>
          <div className="text-xs font-bold text-gray-600 px-4 py-2 bg-linear-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
            {category}
          </div>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 flex justify-between items-center transition-all group cursor-pointer"
            >
              <span className="text-sm text-gray-900 font-semibold group-hover:text-blue-600 transition-colors">{item.name}</span>
              <span className="text-blue-600 font-bold">₹{(item.price / 100).toFixed(2)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default MenuItemsList;
