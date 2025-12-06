// store/useDashboardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Widget {
  id: string;
  type: 'table' | 'card' | 'chart';
  title: string;
  config: {
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
  setTheme: (theme: 'light' | 'dark') => void;
  setEditMode: (mode: boolean) => void;
  exportConfig: () => string;
  importConfig: (config: string) => void;
  clearDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      theme: 'light',
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

      updateWidgetPosition: (id, position) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      setTheme: (theme) => set({ theme }),

      setEditMode: (mode) => set({ editMode: mode }),

      exportConfig: () => {
        const state = get();
        return JSON.stringify({
          widgets: state.widgets,
          theme: state.theme,
        });
      },

      importConfig: (config) => {
        try {
          const parsed = JSON.parse(config);
          set({
            widgets: parsed.widgets || [],
            theme: parsed.theme || 'light',
          });
        } catch (error) {
          console.error('Failed to import config:', error);
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