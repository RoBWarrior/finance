// components/AddWidgetModal.tsx
'use client';

import React, { useState } from 'react';
import JsonExplorer from './JsonExplorer';
import { useDashboardStore, Widget } from '../store/useDashboardStore';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const addWidget = useDashboardStore((s) => s.addWidget);

  const [title, setTitle] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [widgetType, setWidgetType] = useState<'table' | 'card' | 'chart'>('table');
  const [refreshInterval, setRefreshInterval] = useState<number>(30);

  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  async function handleTest() {
    setError(null);
    setLoading(true);
    setSample(null);
    setSelectedFields([]);

    if (!apiUrl) {
      setError('Please enter an API URL.');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(apiUrl, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setSample(data);

      const probe = Array.isArray(data) ? data[0] : data && typeof data === 'object' ? data : null;
      const recommended: string[] = [];
      if (probe && typeof probe === 'object') {
        for (const k of Object.keys(probe)) {
          const v = (probe as any)[k];
          if (typeof v === 'number' || typeof v === 'string') recommended.push(k);
          if (recommended.length >= 3) break;
        }
      }
      setSelectedFields(recommended);
    } catch (err: any) {
      try {
        const proxyResp = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: apiUrl }),
        });
        if (!proxyResp.ok) throw new Error(`Proxy error`);
        const data = await proxyResp.json();
        setSample(data);
      } catch (err2: any) {
        setError('Failed to fetch. CORS or network error.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    if (!sample) {
      alert('Please Test API first.');
      return;
    }

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: title || `New ${widgetType}`,
      config: {
        apiUrl,
        fields: selectedFields.length ? selectedFields : undefined,
        refreshInterval: Math.max(5000, (refreshInterval || 30) * 1000),
      },
      position: { x: 0, y: 0, w: 1, h: 1 },
    };

    addWidget(newWidget);
    onClose();
    setTitle('');
    setApiUrl('');
    setSample(null);
    setSelectedFields([]);
    setRefreshInterval(30);
    setWidgetType('table');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-[#0f1f3d] rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Add New Widget</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Widget Name</label>
            <input
              className="w-full px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bitcoin Price Tracker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API URL</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.coinbase.com/v2/exchange-rates?currency=BTC"
              />
              <button
                onClick={handleTest}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin"></span>
                    Testing...
                  </>
                ) : (
                  <>
                    Test
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {sample && (
              <div className="mt-2 px-3 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 text-sm flex items-center gap-2">
                <span>✓</span>
                API connection successful — {selectedFields.length} top-level fields found
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Display Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setWidgetType('card')}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    widgetType === 'card'
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'bg-[#1a2942] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Card
                </button>
                <button
                  onClick={() => setWidgetType('table')}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    widgetType === 'table'
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'bg-[#1a2942] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setWidgetType('chart')}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    widgetType === 'chart'
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'bg-[#1a2942] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Chart
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Refresh Interval (seconds)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value) || 30)}
                min={5}
              />
            </div>
          </div>

          {sample && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Fields to Display</label>
                <div className="bg-[#1a2942] border border-gray-700 rounded-lg p-4 max-h-64 overflow-auto">
                  <JsonExplorer
                    sample={sample}
                    initialSelection={selectedFields}
                    onChange={(next) => setSelectedFields(next)}
                  />
                </div>
                {selectedFields.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Selected fields: <span className="text-teal-400">{selectedFields.join(', ')}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1a2942] hover:bg-[#243554] text-gray-300 rounded-lg border border-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}