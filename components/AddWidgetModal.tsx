// components/AddWidgetModal.tsx
'use client';

import { useState } from 'react';
import { useDashboardStore, Widget } from '../store/useDashboardStore';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const { addWidget } = useDashboardStore();
  const [step, setStep] = useState(1);
  const [widgetType, setWidgetType] = useState<'table' | 'card' | 'chart'>('card');
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<any>({
    symbols: [],
    symbol: '',
    cardType: 'watchlist',
    chartType: 'line',
    interval: 'daily',
    refreshInterval: 60000,
  });

  const handleAddSymbol = (symbol: string) => {
    if (symbol && !config.symbols.includes(symbol.toUpperCase())) {
      setConfig({
        ...config,
        symbols: [...config.symbols, symbol.toUpperCase()],
      });
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setConfig({
      ...config,
      symbols: config.symbols.filter((s: string) => s !== symbol),
    });
  };

  const handleCreate = () => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: title || `New ${widgetType}`,
      config,
      position: { x: 0, y: 0, w: 1, h: 1 },
    };

    addWidget(newWidget);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setWidgetType('card');
    setTitle('');
    setConfig({
      symbols: [],
      symbol: '',
      cardType: 'watchlist',
      chartType: 'line',
      interval: 'daily',
      refreshInterval: 60000,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add New Widget</h2>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Select Widget Type</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setWidgetType('card')}
                className={`p-6 border-2 rounded-lg text-center transition ${
                  widgetType === 'card'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-2">🃏</div>
                <div className="font-semibold">Card</div>
                <div className="text-sm text-gray-500">Watchlist, Gainers</div>
              </button>
              <button
                onClick={() => setWidgetType('chart')}
                className={`p-6 border-2 rounded-lg text-center transition ${
                  widgetType === 'chart'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-2">📈</div>
                <div className="font-semibold">Chart</div>
                <div className="text-sm text-gray-500">Line, Candlestick</div>
              </button>
              <button
                onClick={() => setWidgetType('table')}
                className={`p-6 border-2 rounded-lg text-center transition ${
                  widgetType === 'table'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-2">📋</div>
                <div className="font-semibold">Table</div>
                <div className="text-sm text-gray-500">Stock List</div>
              </button>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Configure Widget</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Widget Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`My ${widgetType}`}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            {widgetType === 'card' && (
              <div>
                <label className="block text-sm font-medium mb-2">Card Type</label>
                <select
                  value={config.cardType}
                  onChange={(e) => setConfig({ ...config, cardType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="watchlist">Watchlist</option>
                  <option value="gainers">Market Gainers</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
            )}

            {(widgetType === 'table' || config.cardType === 'watchlist') && (
              <div>
                <label className="block text-sm font-medium mb-2">Stock Symbols</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter symbol (e.g., AAPL)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSymbol(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.symbols.map((symbol: string) => (
                    <span
                      key={symbol}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm flex items-center gap-2"
                    >
                      {symbol}
                      <button
                        onClick={() => handleRemoveSymbol(symbol)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(widgetType === 'chart' || config.cardType === 'performance') && (
              <div>
                <label className="block text-sm font-medium mb-2">Stock Symbol</label>
                <input
                  type="text"
                  value={config.symbol}
                  onChange={(e) =>
                    setConfig({ ...config, symbol: e.target.value.toUpperCase() })
                  }
                  placeholder="AAPL"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            )}

            {widgetType === 'chart' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Chart Type</label>
                  <select
                    value={config.chartType}
                    onChange={(e) => setConfig({ ...config, chartType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="line">Line Chart</option>
                    <option value="candlestick">Candlestick</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Interval</label>
                  <select
                    value={config.interval}
                    onChange={(e) => setConfig({ ...config, interval: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Widget
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}