// components/widgets/CardWidget.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Widget } from '../../store/useDashboardStore';
import { fetchWithProxy } from '../../lib/fetchWithProxy';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useSocket } from '../../lib/useSocket';

interface CardWidgetProps {
  widget: Widget;
  onRemove: () => void;
  onEdit: () => void;
}

function getValueByPath(obj: any, path: string) {
  if (!path || obj == null) return undefined;
  try {
    const parts = path.split('.').flatMap((part) => {
      const re = /([^\[\]]+)|\[(\d+)\]/g;
      const out: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(part)) !== null) {
        if (m[1]) out.push(m[1]);
        if (m[2]) out.push(m[2]);
      }
      return out;
    });

    let cur: any = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = /^\d+$/.test(p) && Array.isArray(cur) ? cur[Number(p)] : cur[p];
    }
    return cur;
  } catch {
    return undefined;
  }
}

export default function CardWidget({ widget, onRemove, onEdit }: CardWidgetProps) {
  const theme = useDashboardStore((s) => s.theme);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // socket hook - expects { subscribe } returning unsubscribe function
  const { subscribe } = useSocket('ws://localhost:4001');

  // Theme colors (kept same as your UI)
  const colors = {
    bgPrimary: theme === 'dark' ? '#0f1f3d' : '#ffffff',
    bgSecondary: theme === 'dark' ? '#1a2942' : '#f3f4f6',
    border: theme === 'dark' ? '#374151' : '#d1d5db',
    textPrimary: theme === 'dark' ? '#ffffff' : '#111827',
    textSecondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
    textTertiary: theme === 'dark' ? '#6b7280' : '#9ca3af',
  };

  // Fetch remote data (API URL configured on widget.config.apiUrl)
  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const configAny = (widget.config as any) || {};
      const url = configAny.apiUrl as string | undefined;

      if (url) {
        const payload = await fetchWithProxy(url);
        setData(payload);
        setLastUpdated(new Date());
        setCurrentPage(1);

        const cfgPageSize =
          typeof configAny.pagination?.pageSize === 'number' ? configAny.pagination.pageSize : undefined;
        if (cfgPageSize) setPageSize(Math.max(1, cfgPageSize));
      } else {
        setError('No API URL configured');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Periodic fetch when config changes (keeps existing UI behavior)
  useEffect(() => {
    fetchData();
    const rawInterval = (widget.config && (widget.config as any).refreshInterval) as number | undefined;
    const ms = Math.max(5000, typeof rawInterval === 'number' ? rawInterval : 60000);
    const iv = setInterval(fetchData, ms);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.config]);

  // Stable value(s) used for WS subscription - extract symbol explicitly to avoid re-subscribing every render
  const symbol = (widget.config as any)?.symbol as string | undefined;
  const mappingY = (widget.config as any)?.mapping?.y as string | undefined;

  // WebSocket live update subscription
  useEffect(() => {
    if (!symbol || typeof subscribe !== 'function') return;

    const channel = `symbol:${symbol}`;

    const unsubscribe = subscribe(channel, (msg: any) => {
      if (!msg) return;

      // Try common fields first, then mapping path if configured
      const liveValue =
        msg.price ??
        msg.value ??
        msg.last ??
        getValueByPath(msg, mappingY ?? '');

      if (liveValue == null) return;

      setData((prev: any) => {
        // If prev is array, put live into first element (non-destructive)
        if (Array.isArray(prev)) {
          const copy = [...prev];
          const first = copy[0] && typeof copy[0] === 'object' ? { ...copy[0], live: liveValue } : { live: liveValue };
          copy[0] = first;
          return copy;
        }

        // Ensure data remains object-shaped so getValueByPath works reliably
        const base = prev && typeof prev === 'object' ? prev : {};
        return { ...base, live: liveValue };
      });

      setLastUpdated(new Date());
    });

    // subscribe should return an unsubscribe function; guard in case it's not
    return typeof unsubscribe === 'function' ? unsubscribe : () => {};
  }, [symbol, mappingY, subscribe]);

  // Fields handling - include 'live' automatically so realtime value is visible when fields selected
  const userFields = (widget.config && (widget.config as any).fields) as string[] | undefined;
  const fields = userFields && userFields.length > 0
    ? (userFields.includes('live') ? userFields : [...userFields, 'live'])
    : [];

  const isDataArray = Array.isArray(data);
  const paginateFields = fields.length > 0;

  const itemsToPaginate = React.useMemo(() => {
    if (paginateFields) return fields.slice();
    if (isDataArray) return (data as any[])?.slice() || [];
    return [];
  }, [fields, paginateFields, isDataArray, data]);

  const totalItems = itemsToPaginate.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const pageItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return itemsToPaginate.slice(start, start + pageSize);
  }, [itemsToPaginate, currentPage, pageSize]);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const renderFieldCard = (fieldPath: string) => {
    const value = getValueByPath(data, fieldPath);
    const displayValue =
      value != null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : 'N/A';

    return (
      <div
        key={fieldPath}
        className="rounded-lg p-4 border transition-colors"
        style={{
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
        }}
      >
        <div
          className="text-xs mb-2 font-medium uppercase tracking-wide"
          style={{ color: colors.textTertiary }}
        >
          {fieldPath}
        </div>
        <div
          className="text-2xl font-bold break-all"
          style={{ color: colors.textPrimary }}
        >
          {displayValue}
        </div>
      </div>
    );
  };

  const renderArrayItem = (item: any, idx: number) => {
    if (fields.length === 0) {
      return (
        <div
          key={idx}
          className="rounded-lg p-4 border transition-colors"
          style={{
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
          }}
        >
          <pre
            className="text-sm whitespace-pre-wrap font-mono"
            style={{ color: colors.textSecondary }}
          >
            {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
          </pre>
        </div>
      );
    }

    return (
      <div key={idx} className="space-y-3">
        {fields.map((fieldPath) => {
          const value = getValueByPath(item, fieldPath);
          const displayValue =
            value != null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : 'N/A';

          return (
            <div
              key={fieldPath}
              className="rounded-lg p-4 border transition-colors"
              style={{
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              }}
            >
              <div
                className="text-xs mb-2 font-medium uppercase tracking-wide"
                style={{ color: colors.textTertiary }}
              >
                {fieldPath}
              </div>
              <div
                className="text-2xl font-bold break-all"
                style={{ color: colors.textPrimary }}
              >
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col rounded-xl shadow-2xl border transition-colors"
      style={{
        backgroundColor: colors.bgPrimary,
        borderColor: colors.border,
      }}
    >
      <div
        className="flex justify-between items-center px-5 py-4 border-b"
        style={{ borderColor: colors.border }}
      >
        <div>
          <h3 className="text-lg font-bold truncate" style={{ color: colors.textPrimary }}>
            {widget.title}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
            {paginateFields ? `${totalItems} fields` : isDataArray ? `${totalItems} items` : 'Data card'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            style={{ color: colors.textSecondary }}
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-all cursor-pointer"
            style={{ color: colors.textSecondary }}
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-2 rounded-lg transition-all cursor-pointer"
            style={{ color: colors.textSecondary }}
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {loading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-400 text-sm mb-4">{error}</div>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!error && data && (
          <div className="space-y-4">
            {paginateFields ? (
              <div className="space-y-4">
                {pageItems.map((fieldPath: string) => (
                  <div key={fieldPath}>{renderFieldCard(fieldPath)}</div>
                ))}
              </div>
            ) : isDataArray ? (
              <div className="space-y-4">
                {pageItems.map((item: any, idx: number) => (
                  <div key={(item && item.id) || idx}>{renderArrayItem(item, idx)}</div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center text-sm py-8" style={{ color: colors.textSecondary }}>
                    {/* Show live if available as fallback */}
                    {getValueByPath(data, 'live') != null ? (
                      <div>
                        <div className="text-xs mb-2 font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                          Live
                        </div>
                        <div className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                          {String(getValueByPath(data, 'live'))}
                        </div>
                      </div>
                    ) : (
                      <>No fields selected. Click settings to edit.</>
                    )}
                  </div>
                ) : (
                  fields.map((fieldPath) => {
                    const value = getValueByPath(data, fieldPath);
                    const displayValue =
                      value != null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : 'N/A';

                    return (
                      <div
                        key={fieldPath}
                        className="rounded-lg p-4 border transition-colors"
                        style={{
                          backgroundColor: colors.bgSecondary,
                          borderColor: colors.border,
                        }}
                      >
                        <div
                          className="text-xs mb-2 font-medium uppercase tracking-wide"
                          style={{ color: colors.textTertiary }}
                        >
                          {fieldPath}
                        </div>
                        <div
                          className="text-2xl font-bold break-all"
                          style={{ color: colors.textPrimary }}
                        >
                          {displayValue}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: colors.textSecondary }}>
            No data available
          </div>
        )}
      </div>

      <div
        className="px-5 py-3 border-t transition-colors"
        style={{
          borderColor: colors.border,
          backgroundColor: `${colors.bgSecondary}50`,
        }}
      >
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: colors.textSecondary }}>
            Last updated: <span style={{ color: colors.textSecondary }}>{formatTimeAgo(lastUpdated)}</span>
          </span>

          {totalItems > 0 && totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border cursor-pointer"
                style={{
                  backgroundColor: colors.bgSecondary,
                  color: colors.textSecondary,
                  borderColor: colors.border,
                }}
              >
                ← Prev
              </button>
              <span style={{ color: colors.textSecondary }}>
                Page <span className="font-medium" style={{ color: colors.textPrimary }}>{currentPage}</span> of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border cursor-pointer"
                style={{
                  backgroundColor: colors.bgSecondary,
                  color: colors.textSecondary,
                  borderColor: colors.border,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
