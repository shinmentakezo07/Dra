# Dashboard Routes

## Available Routes

### Main Dashboard
- **URL**: `http://localhost:3000/dashboard`
- **Description**: Overview page with stats, recent activity, and quick actions
- **Features**:
  - Total requests, spending, credits, latency metrics
  - Recent API activity feed
  - Top models usage chart
  - Quick action cards

### Logs
- **URL**: `http://localhost:3000/dashboard/logs`
- **Description**: Real-time API request logs
- **Features**:
  - Search by model/provider
  - Filter by status (all/success/error)
  - Detailed request information (tokens, cost, latency)
  - Timestamp tracking

### API Keys
- **URL**: `http://localhost:3000/dashboard/keys`
- **Description**: API key management
- **Features**:
  - Create new API keys
  - Show/hide key values
  - Copy to clipboard
  - Revoke keys
  - Track last usage

### Analytics
- **URL**: `http://localhost:3000/dashboard/analytics`
- **Description**: Usage analytics and insights
- **Features**:
  - Time range selector (7d/30d/90d)
  - Daily usage charts
  - Usage by model breakdown
  - Cost tracking

### Other Existing Routes
- **Chat**: `http://localhost:3000/dashboard/chat` (AI assistant)
- **Settings**: `http://localhost:3000/dashboard/settings` (User settings)

## Navigation

All dashboard pages share a common navigation bar with:
- Overview
- Logs
- API Keys
- Analytics

The navigation is responsive and includes a mobile menu.
