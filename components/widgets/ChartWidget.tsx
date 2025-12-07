// components/widgets/ChartWidget.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Widget, useDashboardStore } from '../../store/useDashboardStore';
import { fetchWithProxy } from '../../lib/fetchWithProxy';
import { useSocket } from "../../lib/useSocket";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  onEdit?: () => void;
}

function tryParseNumber(v: any) {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function isDateLike(v: any) {
  if (typeof v !== 'string') return false;
  const d = Date.parse(v);
  return !Number.isNaN(d);
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

export default function ChartWidget({ widget, onRemove, onEdit }: ChartWidgetProps) {
  const theme = useDashboardStore((s) => s.theme);
  const [payload, setPayload] = useState<any>(null);
  const [series, setSeries] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
  const { subscribe } = useSocket(WS_URL);


  // Theme colors
  const colors = {
    bgPrimary: theme === 'dark' ? '#0f1f3d' : '#ffffff',
    bgSecondary: theme === 'dark' ? '#1a2942' : '#f3f4f6',
    border: theme === 'dark' ? '#374151' : '#d1d5db',
    textPrimary: theme === 'dark' ? '#ffffff' : '#111827',
    textSecondary: theme === 'dark' ? '#9ca3af' : '#6b7280',
    gridColor: theme === 'dark' ? '#1a2942' : '#e5e7eb',
    axisColor: theme === 'dark' ? '#374151' : '#9ca3af',
  };

  const cfg = useMemo(() => (widget.config as any) || {}, [widget.config]);
  const mapping = useMemo(() => cfg.mapping || {}, [cfg.mapping]);

  const apiUrl = typeof cfg.apiUrl === 'string' ? cfg.apiUrl : undefined;
  const intervalMs = useMemo(() => {
    const raw = typeof cfg.refreshInterval === 'number' ? cfg.refreshInterval : undefined;
    return Math.max(5000, raw ?? 60000);
  }, [cfg.refreshInterval]);

  const stringifiedMapping = useMemo(() => JSON.stringify(mapping || {}), [mapping]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!apiUrl) throw new Error('No API URL configured');
      const resp = await fetchWithProxy(apiUrl);
      setPayload(resp);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || 'Fetch failed');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl) {
      setPayload(null);
      setSeries([]);
      setLoading(false);
      return;
    }

    fetchData();
    const iv = setInterval(() => {
      if (apiUrl) fetchData();
    }, intervalMs);

    return () => clearInterval(iv);
  }, [apiUrl, intervalMs, fetchData]);


  useEffect(() => {
    if (!cfg.symbol) return;

    const channel = `symbol:${cfg.symbol}`;

    const unsubscribe = subscribe(channel, (msg: any) => {
      if (msg == null) return;
      const price = msg.price ?? msg.value ?? msg.last;
      if (price == null) return;

      const ts = msg.ts ?? msg.time ?? Date.now();
      setSeries(prev => {
        const next = [...prev, {
          x: new Date(ts).toISOString(),
          y: Number(price),
          __raw: msg
        }];
        return next.slice(-200);
      });

      setLastUpdated(new Date());
    });

    return unsubscribe;
  }, [cfg.symbol, subscribe]);



  useEffect(() => {
    if (!payload) {
      setSeries([]);
      return;
    }

    try {
      if (typeof payload === 'object') {
        const tsKey = Object.keys(payload).find(
          (k) => /time series/i.test(k) || /(daily|weekly|monthly).+time series/i.test(k)
        );
        if (tsKey) {
          const timeSeries = payload[tsKey];
          const arr = Object.entries(timeSeries)
            .map(([date, vals]: any) => {
              const v = vals as any;
              return {
                x: date,
                open: tryParseNumber(v['1. open'] ?? v.open ?? v.o),
                high: tryParseNumber(v['2. high'] ?? v.high ?? v.h),
                low: tryParseNumber(v['3. low'] ?? v.low ?? v.l),
                close: tryParseNumber(v['4. close'] ?? v.close ?? v.c),
                volume: tryParseNumber(v['5. volume'] ?? v.volume ?? v.v),
                __raw: v,
              };
            })
            .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

          if (mapping && (mapping.x || mapping.y)) {
            const mapped = arr
              .map((r: any) => {
                const xVal = mapping.x ? getValueByPath(r, mapping.x) : r.x;
                const yVal = mapping.y ? getValueByPath(r, mapping.y) : r.close;
                return { ...r, x: xVal, y: tryParseNumber(yVal) };
              })
              .filter((s: any) => s.y != null);
            setSeries(mapped);
            return;
          }

          setSeries(arr.map((r: any) => ({ ...r, x: r.x, y: r.close })));
          return;
        }
      }

      if (Array.isArray(payload) && payload.length > 0) {
        if (mapping && (mapping.x || mapping.y)) {
          const mapped = payload
            .map((row: any) => {
              const x = mapping.x ? getValueByPath(row, mapping.x) : row.x ?? row.time ?? row.timestamp;
              const y = mapping.y
                ? tryParseNumber(getValueByPath(row, mapping.y))
                : tryParseNumber(row.value ?? row.y ?? row.close);
              return { x, y, __raw: row };
            })
            .filter((s: any) => s.y != null);
          setSeries(mapped);
          return;
        }

        const sample = payload[0];
        const keys = Object.keys(sample || {});
        let xKey: string | undefined;
        let yKey: string | undefined;
        for (const k of keys) {
          const v = sample[k];
          if (!xKey && typeof v === 'string' && isDateLike(v)) xKey = k;
          if (!yKey && (typeof v === 'number' || !isNaN(Number(v)))) yKey = k;
          if (xKey && yKey) break;
        }
        if (!yKey) yKey = keys.find((k) => /close|value|price|rate|last/i.test(k));
        if (!xKey) xKey = keys.find((k) => /date|time|timestamp/i.test(k));
        if (yKey) {
          const mapped = payload
            .map((r: any) => ({
              x: xKey ? getValueByPath(r, xKey) : undefined,
              y: tryParseNumber(getValueByPath(r, yKey)),
              __raw: r,
            }))
            .filter((s: any) => s.y != null);
          setSeries(mapped);
          return;
        }

        if (payload.every((p) => typeof p === 'number' || !isNaN(Number(p)))) {
          setSeries(payload.map((v: any, i: number) => ({ x: i, y: tryParseNumber(v) })));
          return;
        }

        setSeries([]);
        return;
      }

      setSeries([]);
    } catch {
      setSeries([]);
    }
  }, [payload, stringifiedMapping]);

  const chartData = useMemo(
    () =>
      series.map((s) => {
        const xVal = s.x;
        let xLabel: any = xVal;
        if (typeof xVal === 'string' && isDateLike(xVal)) {
          xLabel = new Date(xVal).toISOString();
        }
        return { ...s, xLabel, y: tryParseNumber(s.y) };
      }),
    [series]
  );

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
          {cfg.symbol && <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{cfg.symbol}</p>}
        </div>
        <div className="flex gap-2">
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
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-5">
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

        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, bottom: 8, left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
              <XAxis
                dataKey="xLabel"
                tick={{ fill: colors.textSecondary, fontSize: 12 }}
                tickFormatter={(val: any) => {
                  try {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  } catch {
                    return String(val).slice(0, 10);
                  }
                }}
                minTickGap={20}
                stroke={colors.axisColor}
              />
              <YAxis
                tick={{ fill: colors.textSecondary, fontSize: 12 }}
                tickFormatter={(v: any) => (typeof v === 'number' ? Number(v).toLocaleString() : v)}
                stroke={colors.axisColor}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                }}
                labelFormatter={(label: any) => {
                  try {
                    const d = new Date(label);
                    return d.toLocaleString();
                  } catch {
                    return label;
                  }
                }}
                formatter={(value: any) => (typeof value === 'number' ? `$${value.toLocaleString()}` : value)}
              />
              <Legend wrapperStyle={{ color: colors.textSecondary }} />
              <Line type="monotone" dataKey="y" stroke="#14b8a6" dot={false} strokeWidth={2} name="Value" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="flex items-center justify-center h-full" style={{ color: colors.textSecondary }}>
            No chart data available
          </div>
        )}
      </div>

      <div
        className="px-5 py-3 border-t transition-colors"
        style={{
          borderColor: colors.border,
          backgroundColor: `${colors.bgSecondary}50`
        }}
      >
        <div className="text-xs" style={{ color: colors.textSecondary }}>
          Last updated: <span style={{ color: colors.textSecondary }}>{formatTimeAgo(lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}