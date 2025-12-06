// components/Header.tsx
'use client';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                FinBoard
              </h1>
              <p className="text-sm text-gray-500">
                Your Customizable Finance Dashboard
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}