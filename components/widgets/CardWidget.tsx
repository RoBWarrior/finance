// components/widgets/CardWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiClient, StockQuote } from '../../lib/apiClient';
import { Widget } from '../../store/useDashboardStore';

interface CardWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  onEdit?: () => void;
}

export default function CardWidget({ widget, onRemove, onEdit }: CardWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(
      fetchData,
      widget.config.refreshInterval || 60000
    );
    return () => clearInterval(interval);
  }, [widget.config]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (widget.config.cardType) {
        case 'watchlist':
          if (widget.config.symbols && widget.config.symbols.length > 0) {
            const quotes = await Promise.all(
              widget.config.symbols.map((symbol) =>
                apiClient.getStockQuote(symbol)
              )
            );
            setData(quotes);
          }
          break;

        case 'gainers':
          const marketData = await apiClient.getTopGainersLosers();
          setData(marketData.gainers);
          break;

        case 'performance':
          if (widget.config.symbol) {
            const quote = await apiClient.getStockQuote(widget.config.symbol);
            setData(quote);
          }
          break;
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderWatchlist = () => (
    <div className="space-y-2">
      {data?.map((quote: StockQuote) => (
        <div
          key={quote.symbol}
          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
        >
          <div>
            <div className="font-semibold">{quote.symbol}</div>
            <div className="text-sm text-gray-500">${quote.price.toFixed(2)}</div>
          </div>
          <div
            className={`text-right ${
              quote.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <div className="font-semibold">
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)}
            </div>
            <div className="text-sm">
              {quote.changePercent >= 0 ? '+' : ''}
              {quote.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderGainers = () => (
    <div className="space-y-2">
      {data?.slice(0, 5).map((stock: any, idx: number) => (
        <div
          key={idx}
          className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded"
        >
          <div>
            <div className="font-semibold">{stock.ticker}</div>
            <div className="text-sm text-gray-500">${stock.price}</div>
          </div>
          <div className="text-green-600 font-semibold">
            +{stock.change_percentage}%
          </div>
        </div>
      ))}
    </div>
  );

  const renderPerformance = () => {
    if (!data) return null;
    const quote = data as StockQuote;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">${quote.price.toFixed(2)}</div>
          <div className="text-gray-500">{quote.symbol}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-sm text-gray-500">Change</div>
            <div
              className={`font-semibold ${
                quote.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-sm text-gray-500">Change %</div>
            <div
              className={`font-semibold ${
                quote.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {quote.changePercent >= 0 ? '+' : ''}
              {quote.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{widget.title}</h3>
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

      <div className="flex-1 overflow-auto">
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

        {!loading && !error && data && (
          <>
            {widget.config.cardType === 'watchlist' && renderWatchlist()}
            {widget.config.cardType === 'gainers' && renderGainers()}
            {widget.config.cardType === 'performance' && renderPerformance()}
          </>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}