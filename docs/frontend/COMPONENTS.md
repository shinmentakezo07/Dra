# Frontend Components

---

## UI Primitives (`components/ui/`)

### `button.tsx`

cva-based button component with multiple variants, sizes, and color schemes.

```typescript
// Usage
<Button variant="default" size="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">More</Button>
<Button variant="link">Link</Button>
```

### `glass-card.tsx`

Glassmorphism card container with backdrop blur and border effects. Used extensively across dashboard and landing pages.

### `loading-spinner.tsx`

Animated loading indicator with configurable size and color.

### `toast.tsx`

Toast notification system. Can be called imperatively:

```typescript
import { toast } from "@/components/ui/toast";
toast.success("Operation completed");
toast.error("Something went wrong");
```

---

## Dashboard Components (`components/dashboard/`)

### `DataTable.tsx`

Generic data table component with:

- Sortable columns
- Pagination controls
- Loading state with skeleton
- Empty state display
- Row click handlers
- Custom column renderers

### `MetricCard.tsx`

Analytics metric display card with:

- Title, value, and optional change indicator
- Trend arrows (up/down) with color coding
- Loading skeleton state
- Icon support

### `StatusBadge.tsx`

Status indicator badge with color-coded variants:

- `success` (green) — healthy/completed
- `error` (red) — failed/error
- `warning` (yellow) — pending/warning
- `info` (blue) — informational
- `neutral` (gray) — default

---

## Playground Components (`components/playground/`)

### `PlaygroundMain.tsx`

Top-level orchestrator for the AI Playground page. Manages layout, model selection, and streaming state. Coordinates between:

- ChatInterface (message display)
- ModelSelector (model picking)
- Theme/Layout selectors
- Performance metrics display

### `ChatInterface.tsx`

Core chat message display with:

- Streaming message rendering
- Markdown and code syntax highlighting
- Message bubbles (user vs assistant)
- Token usage display
- Copy-to-clipboard on messages

### `ModelSelector.tsx`

Provider and model selection dropdown:

- Groups models by provider
- Shows model capabilities badges
- Displays pricing info
- Favorites/recent models

### `ThemeSelector.tsx` / `LayoutSelector.tsx`

Playground customization controls:

- Theme selection (light/dark/custom)
- Layout modes (split, tabbed, full)
- Persists preferences

### `Terminal.tsx`

Terminal-style streaming output interface:

- Monospace font
- Typing animation effect
- Scroll-to-bottom on new content
- Copy output button

### `PerformanceMetrics.tsx`

Live streaming performance overlay:

- Tokens per second
- First token latency
- Total streaming time
- Token count

### `ShareModal.tsx` / `SnippetsModal.tsx`

- Share: Generate shareable link for conversation
- Snippets: Code examples in multiple languages (cURL, Python, JS, Go)

### `ProviderColors.ts`

Centralized color mapping for all AI providers. Ensures consistent colors across the app for provider badges, model cards, and playground headers.

---

## Models Components (`components/models/`)

### `ModelCard.tsx`

Model listing card in the Models browser:

- Model name and provider
- Pricing info (input/output per 1k tokens)
- Capability badges (text, vision, code, reasoning)
- Context window size
- Supports thinking/vision/tools indicators

### `ModelsExplorer.tsx`

Full model browser with:

- Search/filter by name or provider
- Category grouping
- Provider filter tabs
- Sort by price, context window, or name

### `ModelsHero.tsx`

Hero section for the Models page with animated gradient background.

### Detail Components (`components/models/detail/`)

| Component               | Description                             |
| ----------------------- | --------------------------------------- |
| `ModelDetailClient.tsx` | Main detail page client component       |
| `ModelIdentity.tsx`     | Model name, provider, and badges        |
| `ArchitecturePanel.tsx` | Technical architecture details          |
| `ParametersPanel.tsx`   | Model parameters (params, layers, etc.) |
| `PerformancePanel.tsx`  | Performance benchmarks                  |
| `PricingPanel.tsx`      | Per-token pricing display               |
| `QuickStartCard.tsx`    | Code example for the model              |
| `SpeedometerGauge.tsx`  | Speed visualization gauge               |
| `AmbientBackground.tsx` | Animated background effects             |

---

## Docs Components (`components/docs/`)

| Component            | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `CodeBlock.tsx`      | Syntax-highlighted code with copy button (uses prism-react-renderer) |
| `EndpointCard.tsx`   | API endpoint reference (method, path, description, example)          |
| `ScrollProgress.tsx` | Reading progress bar                                                 |
| `SearchModal.tsx`    | Full-text search across docs pages                                   |
| `Section.tsx`        | Content section with anchor links                                    |
| `TipBox.tsx`         | Info/warning/tip callout box                                         |

---

## Pricing Components (`components/pricing/`)

| Component            | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `CostCalculator.tsx` | Interactive cost estimator (input tokens, output tokens, model selector) |
| `CreditPackages.tsx` | Tiered credit package cards (Starter, Pro, Enterprise)                   |
| `ModelShowcase.tsx`  | Featured model comparison grid                                           |
| `PricingCTA.tsx`     | Call-to-action section with signup prompt                                |
| `PricingFAQ.tsx`     | Accordion-style FAQ section                                              |
| `PricingHero.tsx`    | Pricing page hero with animated gradient                                 |

---

## Other Notable Components

| Component               | File                               | Description                                        |
| ----------------------- | ---------------------------------- | -------------------------------------------------- |
| `Header.tsx`            | `components/Header.tsx`            | Site header with navigation, auth state, user menu |
| `Hero.tsx`              | `components/Hero.tsx`              | Landing page hero with animated particles          |
| `ChatPlayground.tsx`    | `components/ChatPlayground.tsx`    | Full chat playground layout                        |
| `CodeEditor.tsx`        | `components/CodeEditor.tsx`        | Monaco-based code editor for prompt editing        |
| `CyberpunkLogo.tsx`     | `components/CyberpunkLogo.tsx`     | Animated cyberpunk-style logo                      |
| `GatewayDashboard.tsx`  | `components/GatewayDashboard.tsx`  | Gateway interface with live stats                  |
| `MainLayout.tsx`        | `components/MainLayout.tsx`        | Main layout shell with header/footer               |
| `Mermaid.tsx`           | `components/Mermaid.tsx`           | Mermaid diagram renderer                           |
| `ModelDetailModal.tsx`  | `components/ModelDetailModal.tsx`  | Modal for quick model details                      |
| `AIThinkingProcess.tsx` | `components/AIThinkingProcess.tsx` | Animated thinking/reasoning visualization          |
