// components/Header.tsx
'use client';

import { useDashboardStore } from '../store/useDashboardStore';

interface HeaderProps {
  onAddWidget: () => void;
}

export default function Header({ onAddWidget }: HeaderProps) {
  const { theme, setTheme, widgets } = useDashboardStore();

  // Theme colors
  const colors = {
    bgPrimary: theme === 'dark' ? '#0f1f3d' : '#ffffff',
    bgSecondary: theme === 'dark' ? '#1a2942' : '#f3f4f6',
    bgHover: theme === 'dark' ? '#243554' : '#e5e7eb',
    border: theme === 'dark' ? '#374151' : '#d1d5db',
    textPrimary: theme === 'dark' ? '#ffffff' : '#111827',
    textSecondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
  };

  return (
    <header 
      className="border-b transition-colors"
      style={{
        backgroundColor: colors.bgPrimary,
        borderColor: colors.border
      }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 
                className="text-xl font-bold transition-colors" 
                style={{ color: colors.textPrimary }}
              >
                Finance Dashboard
              </h1>
              <p 
                className="text-sm transition-colors" 
                style={{ color: colors.textSecondary }}
              >
                {widgets.length} active widget{widgets.length !== 1 ? 's' : ''} • Real-time data
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                setTheme(newTheme);
                console.log('Theme toggled to:', newTheme);
              }}
              className="p-2.5 rounded-lg transition-all border cursor-pointer"
              style={{
                backgroundColor: colors.bgSecondary,
                color: colors.textSecondary,
                borderColor: colors.border
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode (currently ${theme})`}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bgSecondary}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={onAddWidget}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Widget
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}