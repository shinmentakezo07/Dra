# Neural Playground -- Complete Reference

> **Source files:** `apps/web/components/playground/`, `apps/web/lib/playground-storage.ts`

## Overview

The Neural Playground is a dual-mode feature combining an **AI model comparison chat interface** with a **multi-language code execution environment**. It runs inside the Next.js app at `/playground`.

### Key Features

- Side-by-side AI model comparison (up to 4 models simultaneously)
- Parallel streaming responses from multiple providers
- Multi-language code editor with execution (9 languages)
- Editor theme selection (Dark, Light, High Contrast)
- Layout mode switching (Vertical, Horizontal, Editor Focus, Terminal Focus)
- Code snippet library with category filtering
- Auto-save and session persistence via localStorage
- Code sharing via generated links
- xterm.js terminal for code output
- Monaco editor with bracket pair colorization and smooth scrolling

### Architecture & Component Hierarchy

```
PlaygroundMain (orchestrator, state owner)
├── SnippetsModal (code example browser)
├── ShareModal (code sharing)
├── Language Sidebar (9 language icons)
├── Toolbar
│   ├── ThemeSelector
│   ├── LayoutSelector
│   ├── Action buttons (copy, download, reset, fullscreen, run)
│   └── Execution history dropdown
├── Editor (Monaco)
└── Output Panel
    ├── Terminal (xterm.js) — for code output
    └── Iframe Preview — for HTML
```

## Component Breakdown

### PlaygroundMain (`PlaygroundMain.tsx`)

**Purpose:** Top-level orchestrator that owns all state and coordinates the code editor, terminal, and modals.

**State:**
| State | Type | Default | Description |
|-------|------|---------|-------------|
| `activeLang` | `LanguageKey` | `python` | Currently selected language |
| `code` | `string` | Language default | Current editor content |
| `isRunning` | `boolean` | `false` | Execution in progress |
| `iframeSrc` | `string` | `""` | HTML preview source (HTML mode only) |
| `editorTheme` | `EditorTheme` | `vs-dark` | Monaco theme |
| `layoutMode` | `LayoutMode` | `vertical` | Editor/output split layout |
| `executionHistory` | `ExecutionResult[]` | `[]` | Last 10 execution results |
| `lastSaved` | `Date | null` | `null` | Last auto-save timestamp |

**Handler:**
| Handler | Trigger | Behavior |
|---------|---------|----------|
| `handleLangChange` | Language icon click | Saves current code to cache, switches language, resets output |
| `runCode` | Run button / Ctrl+Enter | Executes code via Piston API or renders HTML preview |
| `copyCode` | Copy button | Clipboard write of current code |
| `downloadCode` | Download button | Blob download with language-appropriate extension |
| `resetCode` | Reset button | Restores default code template for current language |
| `toggleFullscreen` | Fullscreen button | Browser fullscreen API |
| `handleSnippetSelect` | Snippet click in modal | Replaces editor content with snippet code |

**States:**

- **Empty/Initial**: Shows code editor with default Python template, terminal with "Terminal Ready" banner.
- **Loading**: Run button disabled with spinner, terminal shows "Running..." message.
- **Execution Complete**: Terminal shows stdout/stderr output, exit code, execution time. Performance metrics bar appears.
- **Error**: Terminal shows error message in red with troubleshooting suggestion.
- **HTML Preview**: Output panel renders an `<iframe>` with `sandbox="allow-scripts allow-modals"` attribute.
- **Not Mounted**: Returns `null` (first render guard).

**Supported Languages:**
| Language | Mode | Piston Version | Extension |
|----------|------|----------------|-----------|
| Python | `python` | 3.10.0 | `.py` |
| JavaScript | `javascript` | 18.15.0 | `.js` |
| TypeScript | `typescript` | 5.0.3 | `.ts` |
| HTML/CSS | `html` | N/A (inline) | `.html` |
| C | `c` | 10.2.0 | `.c` |
| C++ | `cpp` | 10.2.0 | `.cpp` |
| Go | `go` | 1.16.2 | `.go` |
| Rust | `rust` | 1.68.2 | `.rs` |
| Java | `java` | 15.0.2 | `.java` |

HTML mode does not use the Piston API -- it renders the code directly in a sandboxed `<iframe>`.

### ChatInterface (`ChatInterface.tsx`)

**Purpose:** Renders the multi-model chat comparison UI. Shows model response cards side-by-side for each user message.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `sessions` | `ChatSession[]` | Active model sessions (each session = one model) |
| `sharedMessages` | `Message[]` | Full conversation message history |
| `inputMessage` | `string` | Current input textarea content |
| `setInputMessage` | `(v: string) => void` | Input setter |
| `isLoading` | `boolean` | Stream in progress |
| `onSend` | `() => void` | Send message handler |
| `onReset` | `() => void` | Reset conversation handler |
| `onAddModel` | `() => void` | Open model selector handler |
| `streamingContent` | `Record<string, string>` | Per-session streaming text |
| `streamErrors` | `Record<string, string>` | Per-session error messages |

**Sub-Components:**

- **EmptyState**: Animated orbital rings background with "Select Models to Start" CTA. Shown when `sessions.length === 0`.
- **UserMessageBubble**: Animated user message with timestamp. Glowing gradient border on hover.
- **ModelResponseCard**: Provider-colored card with logo, model name, response content, copy button. Shows streaming indicator, "Thinking..." state, and error state.
- **ChatSessionCard**: Legacy single-session card variant with provider accent line, feedback buttons (thumbs up/down), copy button.

**States:**
| State | Condition | Visual |
|-------|-----------|--------|
| Empty | `sessions.length === 0` | Orbital rings animation + CTA |
| No messages | Sessions exist but `sharedMessages.length === 0` | "Send a message to compare models" |
| Loading | `isLoading === true` | Send button shows spinner, textarea disabled |
| Streaming | Per-session `streamingContent` non-empty | Blinking cursor, content appears incrementally |
| Error | `streamErrors` for a session | Red error card for that model |
| Complete | All sessions done streaming | Full responses with copy/feedback buttons |

### ModelSelector (`ModelSelector.tsx`)

**Purpose:** Full-screen modal for browsing and selecting up to 4 models for comparison.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close handler |
| `models` | `EnrichedModel[]` | All available models |
| `selectedModels` | `EnrichedModel[]` | Currently selected models |
| `onConfirm` | `(models: EnrichedModel[]) => void` | Selection confirmation |

**Features:**

- Search with text highlighting (matches name, ID, provider, description)
- Provider sidebar with color-coded dots and model counts
- Mobile provider pills (top 8 providers + overflow count)
- Category filters: All Models, Latest
- Model cards with provider icon, name, context length, pricing, description
- Visual selection state with animated checkmarks and corner accents
- "At limit" opacity for deselected models when `MAX_MODELS` (4) is reached
- Bottom bar showing selected models with numbered chips and remove buttons
- Animated entrance/exit with Framer Motion

**States:**
| State | Condition | Visual |
|-------|-----------|--------|
| Loading/Empty | No models available | "No models found" with brain icon |
| Filtered empty | Search/filter yields no results | "No models match" with clear filters button |
| At limit | 4 models selected | Remaining models at 20% opacity, disabled |
| Selected | Model in pending list | Animated checkmark, glowing border, corner accents |

### CodeSnippets (`CodeSnippets.tsx`)

**Purpose:** Static data file containing pre-built code examples organized by language and category.

**Snippet shape:** `{ id, name, language, code, description, category }`

**Categories:** `Basics`, `Advanced`, `Data Structures`, `OOP`, `Types`, `Concurrency`, `Memory Management`

**Helper functions:**
| Function | Returns |
|----------|---------|
| `getSnippetsByLanguage(language)` | `CodeSnippet[]` |
| `getSnippetsByCategory(category)` | `CodeSnippet[]` |
| `getAllCategories()` | `string[]` |

### Terminal (`Terminal.tsx`)

**Purpose:** xterm.js terminal wrapper for displaying code execution output.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onMount` | `(term: Terminal) => void` | Callback when terminal is initialized |

**Features:**

- Dynamic import of `@xterm/xterm` and `@xterm/addon-fit` (code-split)
- JetBrains Mono font
- Bar cursor with blink
- ANSI color theme matching the dark UI
- ResizeObserver for auto-fit
- Terminal banner on mount: `"Terminal Ready"`

### ThemeSelector (`ThemeSelector.tsx`)

**Purpose:** Dropdown for switching Monaco editor theme.

**Options:**
| Value | Label | Icon |
|-------|-------|------|
| `vs-dark` | Dark | Moon |
| `vs-light` | Light | Sun |
| `hc-black` | High Contrast | Sparkles |

### LayoutSelector (`LayoutSelector.tsx`)

**Purpose:** Dropdown for switching editor/output panel layout.

**Options:**
| Value | Label | Description |
|-------|-------|-------------|
| `vertical` | Vertical Split | Side by side (default on large screens) |
| `horizontal` | Horizontal Split | Top and bottom |
| `editor-focus` | Editor Focus | Maximize editor (3:1 ratio) |
| `terminal-focus` | Terminal Focus | Maximize terminal (1:3 ratio) |

### ShareModal (`ShareModal.tsx`)

**Purpose:** Modal for sharing playground code via link or clipboard copy.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close handler |
| `code` | `string` | Code to share |
| `language` | `string` | Language name |

**Features:**

- Copy code to clipboard
- Generate share link (base64-encoded, demo implementation)
- Copy share link to clipboard

### SnippetsModal (`SnippetsModal.tsx`)

**Purpose:** Modal for browsing and inserting code snippets.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close handler |
| `currentLanguage` | `string` | Filter snippets by language |
| `onSelectSnippet` | `(snippet) => void` | Insert snippet into editor |

**Features:**

- Search by name or description
- Category filter pills (All, Basics, Advanced, etc.)
- Grid of snippet cards with name, category badge, description
- Click to insert (closes modal and replaces editor content)

**States:**
| State | Condition | Visual |
|-------|-----------|--------|
| Empty results | No snippets match filters | "No snippets found" with code icon |

### PerformanceMetrics (`PerformanceMetrics.tsx`)

**Purpose:** Mini status bar showing execution statistics after running code.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `executionTime` | `number` | `0` | Execution duration in ms |
| `memoryUsage` | `number` | `0` | Memory usage (reserved) |
| `linesOfCode` | `number` | `0` | Line count |

**Display:**

- Execution Time (clock icon, blue) -- formatted to 2 decimal places
- Lines (activity icon, green) -- raw count
- Status (zap icon, yellow) -- always "Ready"

Hides completely when `executionTime <= 0`.

## Data Flow

### Chat Streaming

```
User types message → clicks Send (or Enter)
  → onSend() fires in parent (PlaygroundMain)
    → Creates user Message in sharedMessages
    → For each selected model session:
        → Sets session.isTyping = true
        → Calls provider API via SDK
        → SSE stream updates streamingContent[sessionId] in real-time
    → On each chunk:
        → streamingContent state update → ChatInterface re-renders cards
    → On stream complete:
        → Final content saved to session.messages
        → streamingContent[sessionId] cleared
        → isTyping set to false
    → On error:
        → streamErrors[sessionId] set
        → Error card displayed
```

**Cancellation:** Each stream uses an `AbortController`. Switching models or resetting the conversation calls `abort()` on all active controllers.

### Code Execution

```
User clicks Run (or Ctrl+Enter)
  → runCode() in PlaygroundMain
    → If HTML mode: sets iframeSrc to code string, skips API call
    → Otherwise:
        → Resets terminal
        → Writes "Running..." to terminal
        → POST to https://emkc.org/api/v2/piston/execute
        → On success:
            → Writes stdout line-by-line to terminal
            → Writes stderr in red
            → Shows exit code and execution time
            → Records to executionHistory (last 10)
        → On error:
            → Writes error message in red to terminal
```

### localStorage Persistence

```
PlaygroundMain mounts
  → loadSession() reads from localStorage key "playground_session"
  → If session exists: restores language and code

On every code change (debounced 3 seconds):
  → AutoSaver.schedule() sets a 3-second timeout
  → On timeout: saveSession() writes { language, code, timestamp } to localStorage
  → "Auto-saved HH:MM:SS" shown in status bar
```

**Source:** `apps/web/lib/playground-storage.ts`

## Theme System

### Editor Themes

| Theme         | Monaco Name | Use Case                |
| ------------- | ----------- | ----------------------- |
| Dark          | `vs-dark`   | Default, matches app UI |
| Light         | `vs-light`  | Bright environments     |
| High Contrast | `hc-black`  | Accessibility           |

### Provider Color Mapping

**Source:** `apps/web/components/playground/ProviderColors.ts`

| Provider           | Color     | Hex       | CSS Class          |
| ------------------ | --------- | --------- | ------------------ |
| OpenAI / GPT       | Green     | `#10A37F` | `text-emerald-400` |
| Anthropic / Claude | Orange    | `#D97757` | `text-orange-400`  |
| Google / Gemini    | Blue      | `#4285F4` | `text-blue-400`    |
| Meta / Llama       | Dark Blue | `#0668E1` | `text-blue-500`    |
| Mistral AI         | Red       | `#F94E4E` | `text-red-400`     |
| DeepSeek           | Indigo    | `#4D6BFA` | `text-indigo-400`  |
| xAI / Grok         | Sky Blue  | `#1DA1F2` | `text-sky-400`     |
| Alibaba / Qwen     | Orange    | `#FF6A00` | `text-orange-500`  |
| Moonshot AI        | Indigo    | `#6366F1` | `text-indigo-400`  |
| Zhipu AI / GLM     | Emerald   | `#10B981` | `text-emerald-400` |
| MiniMax            | Violet    | `#8B5CF6` | `text-violet-400`  |
| Unknown            | Violet    | `#7C3AED` | `text-violet-400`  |

`getProviderColor()` extracts the provider prefix from the model ID (before the first `/`) and looks it up in `providerColorMap`. Unknown providers default to violet.

## Layout Modes

| Mode             | Behavior                                        | Ratio                                           |
| ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| `vertical`       | Editor left, output right (default, responsive) | 3:5 editor to 4:5 output (non-HTML); 1:1 (HTML) |
| `horizontal`     | Editor top, output bottom                       | Same ratios                                     |
| `editor-focus`   | Editor maximized, output minimized              | 3:1 editor to output                            |
| `terminal-focus` | Output maximized, editor minimized              | 1:3 editor to output                            |

On mobile (below `lg` breakpoint), all layouts collapse to a tab switcher (`mobileTab`: "editor" or "output") regardless of layout mode.

## Performance Metrics

### Tracking

After each code execution, `PlaygroundMain` records:

| Metric         | Source                             | Display                         |
| -------------- | ---------------------------------- | ------------------------------- |
| Execution time | `Date.now() - startTime`           | `${n}ms` (2 decimal places)     |
| Lines of code  | `code.split('\n').length`          | Integer count                   |
| Previous runs  | `executionHistory` array (last 10) | Dropdown: language + time in ms |

### Metrics Calculation

- **Execution time**: Wall-clock time from `runCode()` start to Piston API response parsing. Includes network latency.
- **Lines of code**: Counted by splitting code on newlines.
- **Exit code**: From Piston API `result.run.code`. 0 = success, non-zero = error. Displayed with green check or red X.

## Code Snippets

### Available Examples

| Language   | Snippets                                             |
| ---------- | ---------------------------------------------------- |
| JavaScript | Hello World, Async/Await, Array Methods, ES6 Classes |
| Python     | Hello World, List Comprehension, Classes, Decorators |
| TypeScript | Interfaces, Generics                                 |
| Go         | Hello World, Goroutines                              |
| Rust       | Hello World, Ownership                               |
| C++        | Vector + Sort (built into default code)              |
| C          | Factorial (built into default code)                  |
| Java       | Array Sum (built into default code)                  |

### Snippet Generation

Snippets are **static data** defined in `CodeSnippets.tsx`. They are not generated dynamically. Each snippet has:

- A unique `id`
- `name` and `description` for display
- `language` for filtering
- `category` for grouping (Basics, Advanced, Data Structures, OOP, Types, Concurrency, Memory Management)
- `code` with the actual source code

## Sharing

### Share Conversation Flow

1. User clicks Share button in playground toolbar
2. `ShareModal` opens with two options:
   - **Copy Code**: Clipboard write of current editor content
   - **Generate Share Link**: Creates a base64-encoded URL containing code + language metadata
3. Generated link format: `${origin}/playground?share=<truncated-base64>`
4. Link is read-only (the current implementation is a demo -- production would persist to a database and generate a unique short ID)

### Types

**Source:** `apps/web/components/playground/types.ts`

```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelId?: string;
}

interface ChatSession {
  id: string;
  model: EnrichedModel;
  messages: Message[];
  isTyping: boolean;
}

interface HistoryChat {
  id: string;
  title: string;
  sharedMessages: Message[];
  sessions: ChatSession[];
  selectedModels: EnrichedModel[];
  updatedAt: number;
}

interface EnrichedModel {
  id: string;
  name: string;
  logo?: string | null;
  provider: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  description?: string;
}
```
