// components/widgets/ChartWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient, TimeSeriesData } from '../../lib/apiClient';
import { Widget } from '../../store/useDashboardStore';

interface ChartWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  onEdit?: () => void;
}

export default function ChartWidget({ widget, onRemove, onEdit }: ChartWidgetProps) {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(
      fetchData,
      widget.config.refreshInterval || 300000 // 5 minutes
    );
    return () => clearInterval(interval);
  }, [widget.config]);

  const fetchData = async () => {
    if (!widget.config.symbol) {
      setError('No symbol configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timeSeries = await apiClient.getTimeSeries(
        widget.config.symbol,
        widget.config.interval || 'daily'
      );
      setData(timeSeries);
    } catch (err) {
      setError('Failed to fetch chart data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          domain={['auto', 'auto']}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderCandlestickChart = () => (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <div className="text-4xl mb-2">📊</div>
        <div>Candlestick chart coming soon</div>
        <div className="text-sm mt-2">Use line chart for now</div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">{widget.title}</h3>
          {widget.config.symbol && (
            <p className="text-sm text-gray-500">
              {widget.config.symbol} - {widget.config.interval}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800"
            >
              ⚙️
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-600 text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <div>{error}</div>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {widget.config.chartType === 'line' && renderLineChart()}
            {widget.config.chartType === 'candlestick' && renderCandlestickChart()}
          </>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
}