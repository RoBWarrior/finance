// components/EditWidgetModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import JsonExplorer from './JsonExplorer';
import { fetchWithProxy } from '../lib/fetchWithProxy';
import { Widget, useDashboardStore } from '../store/useDashboardStore';

type Props = {
  widget: Widget;
  onClose?: () => void;
};

export default function EditWidgetModal({ widget, onClose }: Props) {
  const updateWidget = useDashboardStore((s) => s.updateWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const initialConfig = (widget.config as any) || {};

  const [title, setTitle] = useState<string>(widget.title || '');
  const [type, setType] = useState<Widget['type']>(widget.type);
  const [apiUrl, setApiUrl] = useState<string>(initialConfig.apiUrl || '');
  const initialMs =
    typeof initialConfig.refreshInterval === 'number' ? initialConfig.refreshInterval : undefined;
  const [refreshSec, setRefreshSec] = useState<number>(initialMs ? Math.round(initialMs / 1000) : 30);

  const [sample, setSample] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(initialConfig.fields) ? initialConfig.fields : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl) {
      handleTest().catch(() => {});
    }
  }, []);

  async function handleTest() {
    if (!apiUrl) {
      setError('Provide an API URL to test.');
      setSample(null);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await fetchWithProxy(apiUrl);
      setSample(data);
    } catch (err: any) {
      setSample(null);
      setError(err?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  function handleClearSample() {
    setSample(null);
    setSelected([]);
    setError(null);
  }

  function handleDelete() {
    if (!confirm('Delete this widget?')) return;
    removeWidget(widget.id);
    onClose?.();
  }

  function handleSave() {
    if (apiUrl && !/^https?:\/\//i.test(apiUrl)) {
      if (!confirm('API URL does not look valid. Save anyway?')) return;
    }

    const mergedConfig = {
      ...(initialConfig || {}),
      apiUrl: apiUrl || undefined,
      fields: selected && selected.length > 0 ? selected : undefined,
      refreshInterval: Math.max(5000, Math.round((refreshSec || 30) * 1000)),
    };

    updateWidget(widget.id, {
      title: title || widget.title,
      type,
      config: mergedConfig,
    } as Partial<Widget>);

    onClose?.();
  }

  return (
    <div className="w-[800px] max-w-[calc(100%-20px)] bg-[#0f1f3d] text-white rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-bold">Edit Widget</h3>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 transition-colors font-medium"
          >
            Delete
          </button>
          <button onClick={() => onClose?.()} className="text-gray-400 hover:text-gray-300 transition-colors">
            Close
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Widget type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Widget['type'])}
              className="w-full px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="card">Card</option>
              <option value="table">Table</option>
              <option value="chart">Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API URL</label>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="https://api.example.com/..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Testing…' : 'Test API'}
            </button>
            <button
              onClick={handleClearSample}
              className="px-4 py-2.5 bg-[#1a2942] hover:bg-[#243554] text-gray-300 rounded-lg border border-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Refresh interval (seconds)</label>
            <input
              type="number"
              min={5}
              value={refreshSec}
              onChange={(e) => setRefreshSec(Number(e.target.value) || 5)}
              className="w-40 px-4 py-2.5 bg-[#1a2942] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => onClose?.()}
              className="px-5 py-2.5 bg-[#1a2942] hover:bg-[#243554] text-gray-300 rounded-lg border border-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div>
          <div className="bg-[#1a2942] border border-gray-700 rounded-lg p-4">
            <strong className="text-sm font-medium text-gray-300 block mb-3">Sample Preview</strong>
            <div className="max-h-[300px] overflow-auto">
              {loading && <div className="text-gray-400 text-sm">Loading sample…</div>}
              {!loading && !sample && !error && (
                <div className="text-gray-500 text-sm">No sample. Click <em>Test API</em></div>
              )}
              {!loading && error && <div className="text-red-400 text-sm">{error}</div>}
              {!loading && sample && (
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                  {JSON.stringify(sample, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {sample && (
        <div className="px-6 pb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Pick fields (click to toggle)</h4>
          <div className="bg-[#1a2942] border border-gray-700 rounded-lg p-4 max-h-64 overflow-auto">
            <JsonExplorer sample={sample} initialSelection={selected} onChange={(next) => setSelected(next)} maxDepth={5} />
          </div>
        </div>
      )}
    </div>
  );
}