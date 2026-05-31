/**
 * Unified streaming SDK for consuming LLM SSE streams.
 *
 * Supports OpenAI, Anthropic, and internal stream formats.
 * Provides parsing, accumulation, and typed event iteration.
 */

// --- SSE event types ---

/** Raw SSE event before parsing. */
export interface SSEEvent {
  event?: string;
  data: string;
}

// --- OpenAI Chat Completion Chunk types ---

export interface OpenAIToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface OpenAIChunkChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    reasoning_content?: string;
    tool_calls?: OpenAIToolCallDelta[];
  };
  finish_reason?: string | null;
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChunkChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// --- Anthropic SSE event types ---

export interface AnthropicContentBlockStart {
  type: "content_block_start";
  index: number;
  content_block: {
    type: string;
    text?: string;
    thinking?: string;
    id?: string;
    name?: string;
    input?: unknown;
  };
}

export interface AnthropicContentBlockDelta {
  type: "content_block_delta";
  index: number;
  delta: {
    type: string;
    text?: string;
    thinking?: string;
    partial_json?: string;
    signature?: string;
  };
}

export interface AnthropicContentBlockStop {
  type: "content_block_stop";
  index: number;
}

export interface AnthropicMessageStart {
  type: "message_start";
  message: {
    id: string;
    type: string;
    role: string;
    model: string;
    content: unknown[];
    stop_reason: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface AnthropicMessageDelta {
  type: "message_delta";
  delta: {
    stop_reason: string;
  };
  usage?: {
    output_tokens: number;
    input_tokens?: number;
    thinking_tokens?: number;
  };
}

export interface AnthropicMessageStop {
  type: "message_stop";
}

export interface AnthropicPing {
  type: "ping";
}

export interface AnthropicError {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export type AnthropicStreamEvent =
  | AnthropicMessageStart
  | AnthropicContentBlockStart
  | AnthropicContentBlockDelta
  | AnthropicContentBlockStop
  | AnthropicMessageDelta
  | AnthropicMessageStop
  | AnthropicPing
  | AnthropicError;

// --- Unified parsed stream event ---

export type StreamEventType =
  | "content"
  | "thinking"
  | "tool_call_start"
  | "tool_call_delta"
  | "finish"
  | "error"
  | "usage";

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  thinking?: string;
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: string;
    index?: number;
  };
  finishReason?: string;
  error?: { code: string; message: string };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    thinkingTokens?: number;
  };
}

// --- Accumulated message ---

export interface AccumulatedMessage {
  content: string;
  thinking: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    thinkingTokens?: number;
  };
}

// --- SSE parser ---

/**
 * Parse an SSE text stream into individual events.
 * Handles `event:` and `data:` lines per the SSE spec.
 */
export function* parseSSE(text: string): Generator<SSEEvent> {
  let currentEvent: string | undefined;
  let currentData: string[] = [];

  for (const line of text.split("\n")) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      currentData.push(line.slice(6));
    } else if (line.startsWith("data:")) {
      currentData.push(line.slice(5));
    } else if (line === "") {
      if (currentData.length > 0) {
        yield {
          event: currentEvent,
          data: currentData.join("\n"),
        };
      }
      currentEvent = undefined;
      currentData = [];
    }
    // Lines starting with ':' are comments (keepalive) — ignore
  }

  // Handle trailing event without blank line
  if (currentData.length > 0) {
    yield { event: currentEvent, data: currentData.join("\n") };
  }
}

// --- Format-specific parsers ---

/** Determine stream format from the first SSE event. */
export function detectFormat(events: Iterable<SSEEvent>): "openai" | "anthropic" | "internal" {
  for (const evt of events) {
    if (evt.event === "message_start" || evt.event === "content_block_start") {
      return "anthropic";
    }
    if (evt.event === "chunk" || evt.event === "thinking" || evt.event === "finish") {
      return "internal";
    }
    try {
      const parsed = JSON.parse(evt.data);
      if (parsed.object === "chat.completion.chunk") return "openai";
      if (parsed.choices) return "openai";
    } catch {
      // not JSON
    }
  }
  return "openai"; // default
}

/** Parse an OpenAI SSE event into a StreamEvent. */
export function parseOpenAIEvent(evt: SSEEvent): StreamEvent[] {
  if (evt.data === "[DONE]") return [];

  let parsed: OpenAIStreamChunk;
  try {
    parsed = JSON.parse(evt.data);
  } catch {
    return [];
  }

  if (parsed.error) {
    return [{ type: "error", error: parsed.error }];
  }

  const events: StreamEvent[] = [];
  const choice = parsed.choices?.[0];
  if (!choice) {
    // Usage-only chunk
    if (parsed.usage) {
      events.push({
        type: "usage",
        usage: {
          promptTokens: parsed.usage.prompt_tokens,
          completionTokens: parsed.usage.completion_tokens,
          totalTokens: parsed.usage.total_tokens,
        },
      });
    }
    return events;
  }

  // Content delta
  if (choice.delta.content) {
    events.push({ type: "content", content: choice.delta.content });
  }

  // Reasoning/thinking delta
  if (choice.delta.reasoning_content) {
    events.push({ type: "thinking", thinking: choice.delta.reasoning_content });
  }

  // Tool call deltas
  if (choice.delta.tool_calls) {
    for (const tc of choice.delta.tool_calls) {
      if (tc.id && tc.function?.name) {
        events.push({
          type: "tool_call_start",
          toolCall: { id: tc.id, name: tc.function.name, index: tc.index },
        });
      }
      if (tc.function?.arguments) {
        events.push({
          type: "tool_call_delta",
          toolCall: { arguments: tc.function.arguments, index: tc.index },
        });
      }
    }
  }

  // Finish
  if (choice.finish_reason) {
    events.push({ type: "finish", finishReason: choice.finish_reason });
  }

  // Usage
  if (parsed.usage) {
    events.push({
      type: "usage",
      usage: {
        promptTokens: parsed.usage.prompt_tokens,
        completionTokens: parsed.usage.completion_tokens,
        totalTokens: parsed.usage.total_tokens,
      },
    });
  }

  return events;
}

/** Parse an Anthropic SSE event into a StreamEvent. */
export function parseAnthropicEvent(evt: SSEEvent): StreamEvent[] {
  if (!evt.event) return [];

  let parsed: AnthropicStreamEvent;
  try {
    parsed = JSON.parse(evt.data);
  } catch {
    return [];
  }

  const events: StreamEvent[] = [];

  switch (parsed.type) {
    case "content_block_delta": {
      const delta = (parsed as AnthropicContentBlockDelta).delta;
      if (delta.type === "text_delta" && delta.text) {
        events.push({ type: "content", content: delta.text });
      } else if (delta.type === "thinking_delta" && delta.thinking) {
        events.push({ type: "thinking", thinking: delta.thinking });
      } else if (delta.type === "input_json_delta" && delta.partial_json) {
        events.push({
          type: "tool_call_delta",
          toolCall: { arguments: delta.partial_json },
        });
      }
      break;
    }
    case "content_block_start": {
      const block = (parsed as AnthropicContentBlockStart).content_block;
      if (block.type === "tool_use") {
        events.push({
          type: "tool_call_start",
          toolCall: {
            id: block.id,
            name: block.name,
            index: (parsed as AnthropicContentBlockStart).index,
          },
        });
      }
      break;
    }
    case "message_delta": {
      const msgDelta = parsed as AnthropicMessageDelta;
      if (msgDelta.delta.stop_reason) {
        events.push({ type: "finish", finishReason: msgDelta.delta.stop_reason });
      }
      if (msgDelta.usage) {
        events.push({
          type: "usage",
          usage: {
            promptTokens: msgDelta.usage.input_tokens ?? 0,
            completionTokens: msgDelta.usage.output_tokens,
            totalTokens: (msgDelta.usage.input_tokens ?? 0) + msgDelta.usage.output_tokens,
            thinkingTokens: msgDelta.usage.thinking_tokens,
          },
        });
      }
      break;
    }
    case "message_stop":
      // Final event — already handled by message_delta
      break;
    case "error":
      events.push({
        type: "error",
        error: {
          code: (parsed as AnthropicError).error.type,
          message: (parsed as AnthropicError).error.message,
        },
      });
      break;
    case "ping":
      // Keepalive — ignore
      break;
  }

  return events;
}

/** Parse an internal format SSE event. */
export function parseInternalEvent(evt: SSEEvent): StreamEvent[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(evt.data);
  } catch {
    return [];
  }

  const events: StreamEvent[] = [];

  switch (evt.event) {
    case "chunk": {
      const chunk = parsed as { delta?: { content?: string; role?: string }; thinking?: string; finish_reason?: string; usage?: unknown };
      if (chunk.delta?.content) {
        events.push({ type: "content", content: chunk.delta.content });
      }
      if (chunk.thinking) {
        events.push({ type: "thinking", thinking: chunk.thinking });
      }
      break;
    }
    case "thinking":
      events.push({ type: "thinking", thinking: parsed.content as string });
      break;
    case "finish":
      events.push({
        type: "finish",
        finishReason: parsed.reason as string,
        usage: parsed.usage as AccumulatedMessage["usage"],
      });
      break;
    case "error":
      events.push({
        type: "error",
        error: { code: parsed.code as string, message: parsed.message as string },
      });
      break;
  }

  return events;
}

// --- Stream accumulator ---

/**
 * Accumulates StreamEvents into a complete message.
 * Thread-safe for use in async generators.
 */
export class StreamAccumulator {
  private _content = "";
  private _thinking = "";
  private _toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
  private _finishReason?: string;
  private _usage?: AccumulatedMessage["usage"];

  addEvent(event: StreamEvent): void {
    switch (event.type) {
      case "content":
        this._content += event.content;
        break;
      case "thinking":
        this._thinking += event.thinking;
        break;
      case "tool_call_start":
        if (event.toolCall?.id) {
          this._toolCalls.push({
            id: event.toolCall.id,
            name: event.toolCall.name ?? "",
            arguments: "",
          });
        }
        break;
      case "tool_call_delta":
        if (this._toolCalls.length > 0) {
          const last = this._toolCalls[this._toolCalls.length - 1];
          last.arguments += event.toolCall?.arguments ?? "";
        }
        break;
      case "finish":
        this._finishReason = event.finishReason;
        break;
      case "usage":
        this._usage = event.usage;
        break;
      case "error":
        // Errors are typically handled by the consumer
        break;
    }
  }

  /** Returns the accumulated message. */
  message(): AccumulatedMessage {
    return {
      content: this._content,
      thinking: this._thinking,
      toolCalls: [...this._toolCalls],
      finishReason: this._finishReason,
      usage: this._usage,
    };
  }

  get content(): string {
    return this._content;
  }

  get thinking(): string {
    return this._thinking;
  }

  get toolCalls() {
    return [...this._toolCalls];
  }

  get finishReason(): string | undefined {
    return this._finishReason;
  }

  get usage(): AccumulatedMessage["usage"] | undefined {
    return this._usage;
  }
}

// --- High-level stream consumer ---

export type StreamFormat = "openai" | "anthropic" | "internal" | "auto";

interface StreamConsumerOptions {
  format?: StreamFormat;
  signal?: AbortSignal;
}

/**
 * Consume an SSE ReadableStream and yield parsed StreamEvents.
 * Auto-detects format if not specified.
 */
export async function* consumeStream(
  body: ReadableStream<Uint8Array>,
  options: StreamConsumerOptions = {},
): AsyncGenerator<StreamEvent, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let format: StreamFormat = options.format ?? "auto";
  let detected = false;

  try {
    while (true) {
      if (options.signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent: string | undefined;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataLines.push(line.slice(6));
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5));
        } else if (line === "" && dataLines.length > 0) {
          const evt: SSEEvent = {
            event: currentEvent,
            data: dataLines.join("\n"),
          };

          // Auto-detect format from first event
          if (format === "auto" && !detected) {
            if (evt.event === "message_start") {
              format = "anthropic";
            } else if (evt.event === "chunk" || evt.event === "thinking") {
              format = "internal";
            } else {
              format = "openai";
            }
            detected = true;
          }

          // Parse based on format
          const parsed =
            format === "anthropic"
              ? parseAnthropicEvent(evt)
              : format === "internal"
                ? parseInternalEvent(evt)
                : parseOpenAIEvent(evt);

          for (const event of parsed) {
            yield event;
          }

          currentEvent = undefined;
          dataLines.length = 0;
        } else if (line.startsWith(":")) {
          // SSE comment (keepalive) — ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Consume a Response object and yield text content as it arrives.
 * Returns the full accumulated message when done.
 */
export async function* streamText(
  response: Response,
  options: StreamConsumerOptions = {},
): AsyncGenerator<string, AccumulatedMessage, unknown> {
  if (!response.body) {
    throw new Error("Response body is null — streaming not supported");
  }

  const acc = new StreamAccumulator();

  for await (const event of consumeStream(response.body, options)) {
    acc.addEvent(event);
    if (event.type === "content" && event.content) {
      yield event.content;
    }
    if (event.type === "error" && event.error) {
      throw new Error(`Stream error: ${event.error.code} — ${event.error.message}`);
    }
  }

  return acc.message();
}

/**
 * Consume a Response object and return the complete accumulated message.
 * Useful when you don't need real-time content streaming.
 */
export async function streamToMessage(
  response: Response,
  options: StreamConsumerOptions = {},
): Promise<AccumulatedMessage> {
  if (!response.body) {
    throw new Error("Response body is null — streaming not supported");
  }

  const acc = new StreamAccumulator();

  for await (const event of consumeStream(response.body, options)) {
    acc.addEvent(event);
    if (event.type === "error" && event.error) {
      throw new Error(`Stream error: ${event.error.code} — ${event.error.message}`);
    }
  }

  return acc.message();
}

/**
 * Create an AbortController that auto-cancels after a timeout.
 */
export function createStreamTimeout(ms: number): AbortController {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Prevent timer from holding the process
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
  return controller;
}
