export default function App() {
  function handleClick(app) {
    if (window.api){
      window.api.launchApp(app);
    }
  }

  handleClick('counter')
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white font-sans antialiased text-slate-900 selection:bg-indigo-100">
      
      {/* Background Decoration (Subtle Glow) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-50" />
      </div>

      {/* Header - Name in the middle on top */}
      <header className="absolute top-12 text-center z-10">
        <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-slate-400 mb-1">
          Platform Access
        </h1>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
          TRINITI DASHBOARD
        </h2>
      </header>

      {/* Main Content - Two Big Buttons */}
      <main className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl px-6 z-10">
        <button 
          onClick={() => handleClick('admin')}
          className="group relative flex-1 flex flex-col items-center justify-center py-16 px-8 bg-white border border-slate-200 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-indigo-200 active:scale-[0.98] cursor-pointer"
        >
          <div className="mb-4 p-4 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 transition-colors">
            <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-lg font-medium text-slate-700">Open Admin App</span>
          <p className="mt-2 text-sm text-slate-400">Manage users and settings</p>
        </button>

        <button 
          onClick={() => handleClick('counter')}
          className="group relative flex-1 flex flex-col items-center justify-center py-16 px-8 bg-white border border-slate-200 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-blue-200 active:scale-[0.98] cursor-pointer"
        >
          <div className="mb-4 p-4 rounded-2xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
            <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <span className="text-lg font-medium text-slate-700">Open Counter App</span>
          <p className="mt-2 text-sm text-slate-400">Real-time metrics tracking</p>
        </button>
      </main>

      {/* Footer - Powered by bottom right */}
      <footer className="absolute bottom-8 right-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:text-slate-500 cursor-default">
          powered by <span className="text-slate-400">triniti solutions</span>
        </p>
      </footer>
    </div>
  );
}