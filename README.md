# FinBoard - Finance Dashboard
A customizable real-time finance dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

---

## What is FinBoard?

FinBoard lets users build personalized finance dashboards by connecting to any financial API. Users can create draggable widgets to display stock prices, crypto rates, and market data with live updates via WebSockets.

---

## Features

- **Drag & Drop**: Rearrange and resize widgets on a grid
- **Three Widget Types**: Tables, Cards, and Charts
- **Real-Time Updates**: WebSocket integration for live data
- **API Flexibility**: Connect to any REST API
- **Theme Toggle**: Light and Dark mode
- **Data Persistence**: Save/load dashboard configurations
- **Field Picker**: Choose specific fields from API responses

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State Management)
- **Recharts** (Charts)
- **React Grid Layout** (Drag & Drop)
- **WebSocket** (Real-time updates)

---

## Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd finboard

# Install dependencies
npm install

# Create environment file
echo 'NEXT_PUBLIC_WS_URL=https://websocket-sdit.onrender.com/' > .env.local

# Run development server
npm run dev

```

Visit `http://localhost:3000`

---

## Project Structure

```
finboard/
├── app/
│   ├── page.tsx              # Main dashboard
│   └── api/proxy/route.ts    # CORS proxy
├── components/
│   ├── Header.tsx            # Top bar with theme toggle
│   ├── DashboardGrid.tsx     # Grid layout manager
│   ├── AddWidgetModal.tsx    # Create widget dialog
│   ├── EditWidgetModal.tsx   # Edit widget dialog
│   ├── JsonExplorer.tsx      # Field selector
│   └── widgets/
│       ├── TableWidget.tsx   # Table display
│       ├── CardWidget.tsx    # Card display
│       └── ChartWidget.tsx   # Chart display
├── lib/
│   ├── apiClient.ts          # API utilities
│   ├── fetchWithProxy.ts     # Fetch with CORS handling
│   └── useSocket.ts          # WebSocket hook
└── store/
    └── useDashboardStore.ts  # Zustand store

```

---

## How It Works

### 1. Adding a Widget

1. Click "Add Widget" in the header
2. Enter an API URL (e.g., `https://api.coinbase.com/v2/exchange-rates?currency=BTC`)
3. Click "Test" to fetch sample data
4. Select fields you want to display
5. Choose widget type (Card/Table/Chart)
6. Set refresh interval
7. Click "Add Widget"

### 2. Widget Types

**Table Widget**

- Displays data in rows and columns
- Search and pagination
- Supports time-series data from Alpha Vantage

**Card Widget**

- Shows key metrics in large cards
- Best for single values or KPIs
- Supports pagination for multiple fields

**Chart Widget**

- Line charts for time-series data
- Auto-detects date and value fields
- Interactive tooltips

### 3. Real-Time Updates

Widgets automatically update via:

- **Polling**: Regular API calls (configurable interval)
- **WebSocket**: Live price feeds for supported symbols

To enable WebSocket:

- Add `symbol` field in widget config (e.g., `AAPL`)
- WebSocket connects to: `https://websocket-sdit.onrender.com/`
- Subscribes to channel: `symbol:AAPL`

### 4. Drag & Drop

- Hover over widget to see drag handle (top-left)
- Drag to move, resize from corners
- Grid auto-saves positions
- Widgets range from 1x1 to 3x3

---

## Configuration

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_WS_URL=https://websocket-sdit.onrender.com/
```

---

## Key Components

### DashboardGrid

Manages widget layout using React Grid Layout. Features:

- 3-column grid on desktop
- Responsive breakpoints
- Drag handle on hover
- Auto-save positions

### AddWidgetModal

Modal for creating widgets:

- API URL input with test button
- JSON explorer for field selection
- Widget type selector
- Refresh interval config

### useSocket Hook

Manages WebSocket connections:

```tsx
const { subscribe } = useSocket(url);

useEffect(() => {
  const unsubscribe = subscribe('symbol:AAPL', (msg) => {
    console.log('Price:', msg.price);
  });
  return unsubscribe;
}, []);

```

### fetchWithProxy

Handles API calls with CORS fallback:

1. Tries direct fetch
2. Falls back to server proxy if CORS blocked
3. Returns parsed JSON

---

## API Integration

### Supported APIs

**Coinbase (Crypto)**

```
https://api.coinbase.com/v2/exchange-rates?currency=BTC
```

**Alpha Vantage (Stocks)**

```
https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo
```

### Field Path Syntax

Select nested fields using dot notation:

- Simple: `price`
- Nested: `data.rates.USD`
- Array: `items[0].name`
- Combined: `data.results[0].price`

### CORS Proxy

If API blocks CORS, requests automatically route through `/api/proxy`:

```tsx
POST /api/proxy
Body: { url: "https://api.example.com/data" }
```

---

## WebSocket Protocol

**Subscribe to channel:**

```json
{
  "type": "subscribe",
  "channel": "symbol:AAPL"
}

```

**Receive updates:**

```json
{
  "channel": "symbol:AAPL",
  "price": 150.25,
  "timestamp": "2024-01-01T10:00:00Z"
}

```

---

## State Management

Using Zustand with localStorage persistence:

```tsx
// Add widget
const addWidget = useDashboardStore(s => s.addWidget);

// Update widget
const updateWidget = useDashboardStore(s => s.updateWidget);

// Toggle theme
const setTheme = useDashboardStore(s => s.setTheme);

// Export config
const exportConfig = useDashboardStore(s => s.exportConfig);

```

Everything auto-saves to `localStorage` under key `finboard-storage`.

---

## Theme System

Two modes: Light and Dark

Toggle via header button. Theme persists across sessions.

**Implementation**: Inline styles that adapt to current theme:

```tsx
const colors = {
  bgPrimary: theme === 'dark' ? '#0f1f3d' : '#ffffff',
  textPrimary: theme === 'dark' ? '#ffffff' : '#111827'
};

```

---

## Troubleshooting

**CORS errors?**

- Dashboard automatically uses proxy
- No action needed

**WebSocket not connecting?**

- Check `.env.local` has correct `NEXT_PUBLIC_WS_URL`
- Verify WebSocket server is running

**Widget not updating?**

- Click refresh button manually
- Check refresh interval (min 5 seconds)
- Verify API endpoint responds

**Charts empty?**

- Ensure data has numeric values
- Check date fields are valid
- Need at least 2 data points

---

## Example APIs to Try

**Bitcoin Price:**

```
https://api.coinbase.com/v2/exchange-rates?currency=BTC

```

Fields: `data.currency`, `data.rates.USD`

**Apple Stock (Demo):**

```
https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo

```

Fields: `Global Quote.01. symbol`, `Global Quote.05. price`

---
