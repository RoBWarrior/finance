// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import DashboardGrid from '../../components/DashboardGrid';
import AddWidgetModal from '../../components/AddWidgetModal';
import Header from '../../components/Header';

export default function Home() {
  const { exportConfig, importConfig, clearDashboard, theme, widgets } = useDashboardStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Theme colors
  const colors = {
    bgPrimary: theme === 'dark' ? '#0a1628' : '#f3f4f6',
    bgSecondary: theme === 'dark' ? '#1a2942' : '#ffffff',
    bgHover: theme === 'dark' ? '#243554' : '#e5e7eb',
    border: theme === 'dark' ? '#374151' : '#d1d5db',
    textPrimary: theme === 'dark' ? '#ffffff' : '#111827',
    textSecondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
  };

  // Apply theme styles dynamically
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#0a1628');
      root.style.setProperty('--bg-secondary', '#0f1f3d');
      root.style.setProperty('--bg-tertiary', '#1a2942');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#9ca3af');
    } else {
      root.style.setProperty('--bg-primary', '#f3f4f6');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--bg-tertiary', '#f9fafb');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#6b7280');
    }
  }, [theme]);

  const handleExport = () => {
    const config = exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finboard-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = e.target?.result as string;
            
            // Ask user if they want to merge or replace
            if (widgets.length > 0) {
              const merge = confirm(
                `You have ${widgets.length} existing widget(s).\n\n` +
                'Click OK to ADD imported widgets to your dashboard.\n' +
                'Click Cancel to REPLACE all widgets with imported ones.'
              );
              importConfig(config, merge);
            } else {
              // No existing widgets, just import
              importConfig(config, false);
            }
            
            alert('Configuration imported successfully!');
          } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import configuration. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: colors.bgPrimary, 
        transition: 'background-color 0.3s ease' 
      }}
    >
      <Header onAddWidget={() => setShowAddModal(true)} />
      
      <div className="container mx-auto px-6 py-6">
        {/* Toolbar with menu options */}
        <div className="flex justify-end mb-6">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-4 py-2.5 rounded-lg transition-all border flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor: colors.bgSecondary,
                color: colors.textSecondary,
                borderColor: colors.border
              }}
              title="More options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              Options
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl py-2 z-20 border transition-colors"
                  style={{
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.border
                  }}
                >
                  <button
                    onClick={() => {
                      handleExport();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer"
                    style={{ color: colors.textSecondary }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Config
                  </button>
                  <button
                    onClick={() => {
                      handleImport();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer"
                    style={{ color: colors.textSecondary }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Config
                  </button>
                  <div 
                    className="my-2 border-t transition-colors" 
                    style={{ borderColor: colors.border }}
                  />
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all widgets?')) {
                        clearDashboard();
                        setShowMenu(false);
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left text-red-400 flex items-center gap-3 transition-colors cursor-pointer"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <DashboardGrid />
      </div>

      <AddWidgetModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}