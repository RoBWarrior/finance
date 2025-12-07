// components/widgets/TableWidget.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Widget, useDashboardStore } from '../../store/useDashboardStore';
import { fetchWithProxy } from '../../lib/fetchWithProxy';

interface TableWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  onEdit?: () => void;
}

function getValueByPath(obj: any, path: string) {
  if (!path || !obj) return undefined;
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

export default function TableWidget({ widget, onRemove, onEdit }: TableWidgetProps) {
  const theme = useDashboardStore((s) => s.theme);
  const [data, setData] = useState<any[]>([]);
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const defaultPageSize = ((widget.config as any)?.pagination?.pageSize as number) ?? 10;
  const [itemsPerPage, setItemsPerPage] = useState<number>(defaultPageSize);

  // Theme colors
  const colors = {
    bgPrimary: theme === 'dark' ? '#0f1f3d' : '#ffffff',
    bgSecondary: theme === 'dark' ? '#1a2942' : '#f3f4f6',
    bgHover: theme === 'dark' ? '#1a2942' : '#e5e7eb',
    border: theme === 'dark' ? '#374151' : '#d1d5db',
    textPrimary: theme === 'dark' ? '#ffffff' : '#111827',
    textSecondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
    textTertiary: theme === 'dark' ? '#6b7280' : '#9ca3af',
  };

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const configAny = (widget.config as any) || {};
      const url = configAny.apiUrl as string | undefined;

      if (url) {
        const payload = await fetchWithProxy(url);
        setRawPayload(payload);
        let rows: any[] = [];

        const timeSeriesKey =
          payload && typeof payload === 'object'
            ? Object.keys(payload).find((k: string) =>
                k.toLowerCase().includes('time series') || /daily|weekly|monthly/i.test(k)
              )
            : undefined;

        if (timeSeriesKey) {
          const timeSeries = (payload as any)[timeSeriesKey] || {};
          rows = Object.entries(timeSeries).map(([date, values]: [string, any]) => {
            const v = values || {};
            return {
              date,
              open: v['1. open'] ?? v['open'] ?? v['o'],
              high: v['2. high'] ?? v['high'] ?? v['h'],
              low: v['3. low'] ?? v['low'] ?? v['l'],
              close: v['4. close'] ?? v['close'] ?? v['c'],
              volume: v['5. volume'] ?? v['volume'] ?? v['v'],
              __raw: v,
            };
          });
          rows.sort((a, b) => (b.date > a.date ? 1 : -1));
        } else if (Array.isArray(payload)) {
          rows = payload;
        } else if (payload && typeof payload === 'object') {
          const arrKey = Object.keys(payload).find((k) => Array.isArray((payload as any)[k]));
          rows = arrKey ? (payload as any)[arrKey] : [payload];
        }

        setData(rows);
        setLastUpdated(new Date());
        setCurrentPage(1);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch');
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const rawInterval = (widget.config && (widget.config as any).refreshInterval) as number | undefined;
    const ms = Math.max(5000, typeof rawInterval === 'number' ? rawInterval : 60000);
    const iv = setInterval(fetchData, ms);
    return () => clearInterval(iv);
  }, [widget.config]);

  const userFields = (widget.config && (widget.config as any).fields) as string[] | undefined;
  const isTimeSeriesRows =
    data.length > 0 &&
    Object.prototype.hasOwnProperty.call(data[0], 'date') &&
    (Object.prototype.hasOwnProperty.call(data[0], 'open') || Object.prototype.hasOwnProperty.call(data[0], '__raw'));

  const shouldPaginateFields =
    !!userFields && userFields.length > 0 && rawPayload && !Array.isArray(rawPayload) && !isTimeSeriesRows;

  const fieldRows: any[] = useMemo(() => {
    if (!shouldPaginateFields || !userFields) return [];
    return userFields.map((fieldPath) => ({
      field: fieldPath,
      value: getValueByPath(rawPayload, fieldPath),
      __raw: rawPayload,
    }));
  }, [shouldPaginateFields, userFields, rawPayload]);

  const sourceRows = shouldPaginateFields ? fieldRows : data;

  const filteredRows = useMemo(() => {
    if (!searchTerm) return sourceRows;
    const term = searchTerm.toLowerCase();
    return sourceRows.filter((row) => {
      try {
        return JSON.stringify(row).toLowerCase().includes(term);
      } catch {
        return false;
      }
    });
  }, [sourceRows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedData = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = shouldPaginateFields
    ? ['field', 'value']
    : userFields && userFields.length > 0 && !isTimeSeriesRows
    ? userFields
    : isTimeSeriesRows
    ? ['date', 'open', 'high', 'low', 'close', 'volume']
    : paginatedData.length > 0
    ? Object.keys(paginatedData[0])
    : [];

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div 
      className="h-full flex flex-col rounded-xl shadow-2xl border transition-colors"
      style={{ 
        backgroundColor: colors.bgPrimary,
        borderColor: colors.border
      }}
    >
      <div 
        className="flex justify-between items-center px-5 py-4 border-b"
        style={{ borderColor: colors.border }}
      >
        <div>
          <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>{widget.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
            {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
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
          {onEdit && (
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
          )}
          {onRemove && (
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
          )}
        </div>
      </div>

      {!loading && !error && (
        <div className="px-5 py-3 border-b" style={{ borderColor: colors.border }}>
          <div className="relative">
            <svg 
              className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: colors.textSecondary }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:border-teal-500 transition-colors text-sm"
              style={{ 
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-400 mb-4">{error}</div>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && paginatedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead 
                className="sticky top-0 z-10"
                style={{ backgroundColor: colors.bgSecondary }}
              >
                <tr>
                  {columns.map((col) => (
                    <th 
                      key={col} 
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: colors.textTertiary }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {paginatedData.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className="transition-colors"
                    style={{
                      backgroundColor: colors.bgPrimary
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bgPrimary}
                  >
                    {columns.map((col) => {
                      let val: any;
                      if (shouldPaginateFields || isTimeSeriesRows) {
                        val = (row as any)[col];
                      } else if (userFields && userFields.length > 0) {
                        val = getValueByPath(row, col);
                      } else {
                        val = (row as any)[col];
                      }

                      let cellContent: React.ReactNode;
                      if (val == null) 
                        cellContent = <span style={{ color: colors.textTertiary }}>—</span>;
                      else if (typeof val === 'number')
                        cellContent = <span className="font-medium" style={{ color: colors.textPrimary }}>{val.toLocaleString()}</span>;
                      else if (typeof val === 'string')
                        cellContent = <span style={{ color: colors.textSecondary }}>{val.length > 200 ? val.slice(0, 200) + '…' : val}</span>;
                      else 
                        cellContent = <span className="text-xs" style={{ color: colors.textTertiary }}>{JSON.stringify(val).slice(0, 100)}</span>;

                      return (
                        <td key={col} className="px-4 py-3 text-sm">
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && paginatedData.length === 0 && (
          <div className="flex items-center justify-center h-full" style={{ color: colors.textSecondary }}>
            {searchTerm ? 'No matching rows found' : 'No data available'}
          </div>
        )}
      </div>

      {!loading && !error && (
        <div 
          className="px-5 py-3 border-t transition-colors"
          style={{ 
            borderColor: colors.border,
            backgroundColor: `${colors.bgSecondary}50`
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span style={{ color: colors.textSecondary }}>
                Last updated: <span style={{ color: colors.textSecondary }}>{formatTimeAgo(lastUpdated)}</span>
              </span>
              {totalPages > 1 && (
                <span style={{ color: colors.textSecondary }}>
                  Page <span className="font-medium" style={{ color: colors.textPrimary }}>{currentPage}</span> of {totalPages}
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border cursor-pointer"
                  style={{ 
                    backgroundColor: colors.bgSecondary,
                    color: colors.textSecondary,
                    borderColor: colors.border
                  }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border cursor-pointer"
                  style={{ 
                    backgroundColor: colors.bgSecondary,
                    color: colors.textSecondary,
                    borderColor: colors.border
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}