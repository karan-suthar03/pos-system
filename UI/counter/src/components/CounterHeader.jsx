import { ChefHat, CheckCircle2, Printer } from 'lucide-react';

function CounterHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center shrink-0">
            <ChefHat size={24} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-gray-900 leading-none tracking-tight">Sunset Point</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden md:block">
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
              <Printer size={16} />
              <span className="text-xs font-semibold whitespace-nowrap">SunsetPoint-Thermal</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-gray-800">06:42 PM</span>
            <span className="text-xs text-gray-500 font-medium">Tuesday, Mar 25</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CounterHeader;
