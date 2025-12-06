// app/page.tsx
'use client';

import { useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import DashboardGrid from '../../components/DashboardGrid';
import AddWidgetModal from '../../components/AddWidgetModal';
import Header from '../../components/Header';

export default function Home() {
  const { theme, setTheme, editMode, setEditMode, exportConfig, importConfig, clearDashboard } = useDashboardStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
            importConfig(config);
            alert('Configuration imported successfully!');
          } catch (error) {
            alert('Failed to import configuration');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>➕</span> Add Widget
            </button>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                editMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>{editMode ? '✓' : '✏️'}</span>
              {editMode ? 'Done Editing' : 'Edit Mode'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                ⋮
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-10">
                  <button
                    onClick={() => {
                      handleExport();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📥 Export Config
                  </button>
                  <button
                    onClick={() => {
                      handleImport();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    📤 Import Config
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all widgets?')) {
                        clearDashboard();
                        setShowMenu(false);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    🗑️ Clear Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <DashboardGrid />
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}