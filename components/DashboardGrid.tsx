// components/DashboardGrid.tsx
'use client';

import { useDashboardStore } from '../store/useDashboardStore';
import CardWidget from './widgets/CardWidget';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import { useState } from 'react';

export default function DashboardGrid() {
  const { widgets, removeWidget, updateWidgetPosition, editMode } = useDashboardStore();
  const [editingWidget, setEditingWidget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!editMode) return;
    e.dataTransfer.setData('widgetId', widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!editMode) return;
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('widgetId');
    if (draggedId === targetId) return;

    // Simple position swap
    const draggedWidget = widgets.find(w => w.id === draggedId);
    const targetWidget = widgets.find(w => w.id === targetId);

    if (draggedWidget && targetWidget) {
      const tempPos = { ...draggedWidget.position };
      updateWidgetPosition(draggedId, targetWidget.position);
      updateWidgetPosition(targetId, tempPos);
    }
  };

  const renderWidget = (widget: any) => {
    const commonProps = {
      widget,
      onRemove: editMode ? () => removeWidget(widget.id) : undefined,
      onEdit: editMode ? () => setEditingWidget(widget.id) : undefined,
    };

    switch (widget.type) {
      case 'card':
        return <CardWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'table':
        return <TableWidget {...commonProps} />;
      default:
        return null;
    }
  };

  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-semibold mb-2">No Widgets Yet</h3>
          <p className="mb-4">Click "Add Widget" to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          draggable={editMode}
          onDragStart={(e) => handleDragStart(e, widget.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, widget.id)}
          className={`min-h-[300px] ${editMode ? 'cursor-move' : ''}`}
          style={{
            gridColumn: `span ${widget.position.w}`,
            gridRow: `span ${widget.position.h}`,
          }}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );
}