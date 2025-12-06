// components/widgets/TableWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiClient, StockQuote } from '../../lib/apiClient';
import { Widget } from '../../store/useDashboardStore';

interface TableWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  onEdit?: () => void;
}

export default function TableWidget({ widget, onRemove, onEdit }: TableWidgetProps) {
  const [data, setData] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
    const interval = setInterval(
      fetchData,
      widget.config.refreshInterval || 60000
    );
    return () => clearInterval(interval);
  }, [widget.config]);

  const fetchData = async () => {
    if (!widget.config.symbols || widget.config.symbols.length === 0) {
      setError('No symbols configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const quotes = await Promise.all(
        widget.config.symbols.map((symbol) => apiClient.getStockQuote(symbol))
      );
      setData(quotes);
    } catch (err) {
      setError('Failed to fetch stock data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((stock) =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

      {!loading && !error && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      )}

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

        {!loading && !error && paginatedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Symbol</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Change</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Change %</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedData.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-semibold">{stock.symbol}</td>
                    <td className="px-4 py-3 text-right">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stock.change >= 0 ? '+' : ''}
                      {stock.change.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stock.changePercent >= 0 ? '+' : ''}
                      {stock.changePercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {stock.volume.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            {searchTerm ? 'No matching stocks found' : 'No data available'}
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}