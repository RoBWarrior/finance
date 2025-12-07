// store/useDashboardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Widget {
  id: string;
  type: 'table' | 'card' | 'chart';
  title: string;
  config: {
    apiUrl?: string;
    symbol?: string;
    symbols?: string[];
    chartType?: 'line' | 'candlestick';
    interval?: 'daily' | 'weekly' | 'monthly';
    cardType?: 'watchlist' | 'gainers' | 'performance';
    fields?: string[];
    refreshInterval?: number;
  };
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardState {
  widgets: Widget[];
  theme: 'light' | 'dark';
  editMode: boolean;

  // Actions
  addWidget: (widget: Widget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  updateWidgetPosition: (id: string, position: Widget['position']) => void;
  setWidgets: (widgets: Widget[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setEditMode: (mode: boolean) => void;
  exportConfig: () => string;
  importConfig: (config: string, merge?: boolean) => void;
  clearDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      theme: 'dark',
      editMode: false,

      addWidget: (widget) =>
        set((state) => ({
          widgets: [...state.widgets, widget],
        })),

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        })),

      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      updateWidgetPosition: (id: string, position: { x: number; y: number; w: number; h: number }) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      setWidgets: (widgets) => set({ widgets }),

      setTheme: (t) => set({ theme: t }),
      
      toggleTheme: () => {
        const newT = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newT });
      },

      setEditMode: (mode) => set({ editMode: mode }),

      exportConfig: () => {
        const state = get();
        return JSON.stringify({
          widgets: state.widgets,
          theme: state.theme,
        }, null, 2);
      },

      importConfig: (config, merge = false) => {
        try {
          const parsed = JSON.parse(config);
          
          if (merge) {
            // Merge mode: Add imported widgets to existing ones
            const existingWidgets = get().widgets;
            const importedWidgets = parsed.widgets || [];
            
            // Generate new IDs for imported widgets to avoid conflicts
            const newWidgets = importedWidgets.map((w: Widget) => ({
              ...w,
              id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            }));
            
            set({
              widgets: [...existingWidgets, ...newWidgets],
              theme: parsed.theme || get().theme,
            });
          } else {
            // Replace mode: Replace all widgets with imported ones
            set({
              widgets: parsed.widgets || [],
              theme: parsed.theme || 'dark',
            });
          }
        } catch (error) {
          console.error('Failed to import config:', error);
          throw error;
        }
      },

      clearDashboard: () =>
        set({
          widgets: [],
        }),
    }),
    {
      name: 'finboard-storage',
    }
  )
);