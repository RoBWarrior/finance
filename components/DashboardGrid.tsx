// components/DashboardGrid.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useDashboardStore, Widget } from '../store/useDashboardStore';
import TableWidget from './widgets/TableWidget';
import CardWidget from './widgets/CardWidget';
import ChartWidget from './widgets/ChartWidget';
import EditWidgetModal from './EditWidgetModal';

// Import required CSS - make sure these are in your global CSS or here
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
  const { widgets, removeWidget, updateWidgetPosition } = useDashboardStore();
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

  const renderWidget = useCallback((widget: Widget) => {
    const props = {
      widget,
      onRemove: () => {
        if (confirm(`Delete widget "${widget.title}"?`)) {
          removeWidget(widget.id);
        }
      },
      onEdit: () => setEditingWidget(widget),
    };

    switch (widget.type) {
      case 'table':
        return <TableWidget {...props} />;
      case 'card':
        return <CardWidget {...props} />;
      case 'chart':
        return <ChartWidget {...props} />;
      default:
        return <TableWidget {...props} />;
    }
  }, [removeWidget]);

  // Convert widgets to react-grid-layout format
  const layout: Layout[] = useMemo(() => {
    return widgets.map((w) => ({
      i: w.id,
      x: w.position?.x ?? 0,
      y: w.position?.y ?? 0,
      w: w.position?.w ?? 1,
      h: w.position?.h ?? 1,
      minW: 1,
      minH: 1,
      maxW: 3,
      maxH: 3,
    }));
  }, [widgets]);

  // Save layout changes back to store
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    newLayout.forEach(item => {
      updateWidgetPosition(item.i, {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
    });
  }, [updateWidgetPosition]);

  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
            No Widgets Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Click "Add Widget" to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 3, md: 2, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={350}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          compactType="vertical"
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="relative">
              {/* Drag Handle - visible on hover */}
              <div className="absolute top-2 left-2 z-20 drag-handle p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity cursor-move">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 dark:text-gray-400">
                  <circle cx="9" cy="5" r="1" fill="currentColor"/>
                  <circle cx="9" cy="12" r="1" fill="currentColor"/>
                  <circle cx="9" cy="19" r="1" fill="currentColor"/>
                  <circle cx="15" cy="5" r="1" fill="currentColor"/>
                  <circle cx="15" cy="12" r="1" fill="currentColor"/>
                  <circle cx="15" cy="19" r="1" fill="currentColor"/>
                </svg>
              </div>

              {/* Widget Content */}
              <div className="h-full w-full">
                {renderWidget(widget)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Edit Widget Modal */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <EditWidgetModal
            widget={editingWidget}
            onClose={() => setEditingWidget(null)}
          />
        </div>
      )}

      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }
        
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          will-change: transform;
        }
        
        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
          will-change: transform;
        }
        
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(156, 163, 175, 0.4);
          border-bottom: 2px solid rgba(156, 163, 175, 0.4);
        }
        
        .react-grid-item:hover > .react-resizable-handle::after {
          border-right: 2px solid rgba(156, 163, 175, 0.8);
          border-bottom: 2px solid rgba(156, 163, 175, 0.8);
        }
        
        .react-grid-item > .react-resizable-handle-sw {
          bottom: 0;
          left: 0;
          cursor: sw-resize;
          transform: rotate(90deg);
        }
        
        .react-grid-item > .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        
        .react-grid-item > .react-resizable-handle-nw {
          top: 0;
          left: 0;
          cursor: nw-resize;
          transform: rotate(180deg);
        }
        
        .react-grid-item > .react-resizable-handle-ne {
          top: 0;
          right: 0;
          cursor: ne-resize;
          transform: rotate(270deg);
        }
        
        .react-grid-item > .react-resizable-handle-w,
        .react-grid-item > .react-resizable-handle-e {
          top: 50%;
          margin-top: -10px;
          cursor: ew-resize;
        }
        
        .react-grid-item > .react-resizable-handle-w {
          left: 0;
          transform: rotate(135deg);
        }
        
        .react-grid-item > .react-resizable-handle-e {
          right: 0;
          transform: rotate(315deg);
        }
        
        .react-grid-item > .react-resizable-handle-n,
        .react-grid-item > .react-resizable-handle-s {
          left: 50%;
          margin-left: -10px;
          cursor: ns-resize;
        }
        
        .react-grid-item > .react-resizable-handle-n {
          top: 0;
          transform: rotate(225deg);
        }
        
        .react-grid-item > .react-resizable-handle-s {
          bottom: 0;
          transform: rotate(45deg);
        }

        /* Placeholder styling */
        .react-grid-placeholder {
          background: rgba(20, 184, 166, 0.2);
          border: 2px dashed rgba(20, 184, 166, 0.5);
          border-radius: 8px;
          opacity: 0.5;
          transition: all 100ms ease;
          z-index: 2;
        }
      `}</style>
    </>
  );
}