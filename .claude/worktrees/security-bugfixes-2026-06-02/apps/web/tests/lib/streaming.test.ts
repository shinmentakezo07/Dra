import { describe, it, expect } from "vitest";
import {
  parseSSE,
  parseOpenAIEvent,
  parseAnthropicEvent,
  parseInternalEvent,
  StreamAccumulator,
  detectFormat,
} from "@/lib/streaming";

describe("parseSSE", () => {
  it("parses simple data events", () => {
    const text = 'data: {"hello":"world"}\n\n';
    const events = [...parseSSE(text)];
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"hello":"world"}');
    expect(events[0].event).toBeUndefined();
  });

  it("parses named events", () => {
    const text = 'event: message_start\ndata: {"type":"message_start"}\n\n';
    const events = [...parseSSE(text)];
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("message_start");
  });

  it("parses multiple events", () => {
    const text =
      'event: chunk\ndata: {"a":1}\n\nevent: chunk\ndata: {"b":2}\n\n';
    const events = [...parseSSE(text)];
    expect(events).toHaveLength(2);
  });

  it("ignores comments", () => {
    const text = ': keepalive\ndata: {"x":1}\n\n';
    const events = [...parseSSE(text)];
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"x":1}');
  });
});

describe("parseOpenAIEvent", () => {
  it("parses content delta", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }],
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("content");
    expect(events[0].content).toBe("Hello");
  });

  it("parses role delta", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      }),
    };
    const events = parseOpenAIEvent(evt);
    // Role-only delta produces no events (no content/thinking/toolcall/finish)
    expect(events).toHaveLength(0);
  });

  it("parses finish event", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("finish");
    expect(events[0].finishReason).toBe("stop");
  });

  it("parses [DONE]", () => {
    const events = parseOpenAIEvent({ data: "[DONE]" });
    expect(events).toHaveLength(0);
  });

  it("parses usage chunk", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("usage");
    expect(events[0].usage?.totalTokens).toBe(15);
  });

  it("parses tool call delta", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: { name: "get_weather", arguments: '{"loc' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("tool_call_start");
    expect(events[0].toolCall?.id).toBe("call_1");
    expect(events[1].type).toBe("tool_call_delta");
    expect(events[1].toolCall?.arguments).toBe('{"loc');
  });

  it("parses reasoning_content", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "o1-preview",
        choices: [{ index: 0, delta: { reasoning_content: "thinking..." }, finish_reason: null }],
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("thinking");
    expect(events[0].thinking).toBe("thinking...");
  });

  it("parses mid-stream error", () => {
    const evt = {
      data: JSON.stringify({
        id: "cmpl-1",
        object: "chat.completion.chunk",
        created: 1000,
        model: "gpt-4o",
        error: { code: "server_error", message: "disconnected" },
        choices: [{ index: 0, delta: {}, finish_reason: "error" }],
      }),
    };
    const events = parseOpenAIEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].error?.code).toBe("server_error");
  });
});

describe("parseAnthropicEvent", () => {
  it("parses content_block_delta text", () => {
    const evt = {
      event: "content_block_delta",
      data: JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello" },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("content");
    expect(events[0].content).toBe("Hello");
  });

  it("parses thinking delta", () => {
    const evt = {
      event: "content_block_delta",
      data: JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "reasoning..." },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("thinking");
    expect(events[0].thinking).toBe("reasoning...");
  });

  it("parses tool_use content_block_start", () => {
    const evt = {
      event: "content_block_start",
      data: JSON.stringify({
        type: "content_block_start",
        index: 1,
        content_block: { type: "tool_use", id: "tu_1", name: "get_weather", input: {} },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("tool_call_start");
    expect(events[0].toolCall?.id).toBe("tu_1");
    expect(events[0].toolCall?.name).toBe("get_weather");
  });

  it("parses input_json_delta", () => {
    const evt = {
      event: "content_block_delta",
      data: JSON.stringify({
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"location":' },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("tool_call_delta");
    expect(events[0].toolCall?.arguments).toBe('{"location":');
  });

  it("parses message_delta stop reason", () => {
    const evt = {
      event: "message_delta",
      data: JSON.stringify({
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 15 },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("finish");
    expect(events[0].finishReason).toBe("end_turn");
    expect(events[1].type).toBe("usage");
  });

  it("parses error event", () => {
    const evt = {
      event: "error",
      data: JSON.stringify({
        type: "error",
        error: { type: "overloaded_error", message: "Overloaded" },
      }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].error?.code).toBe("overloaded_error");
  });

  it("ignores ping events", () => {
    const evt = {
      event: "ping",
      data: JSON.stringify({ type: "ping" }),
    };
    const events = parseAnthropicEvent(evt);
    expect(events).toHaveLength(0);
  });
});

describe("parseInternalEvent", () => {
  it("parses chunk with content", () => {
    const evt = {
      event: "chunk",
      data: JSON.stringify({ delta: { content: "Hello" } }),
    };
    const events = parseInternalEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("content");
  });

  it("parses thinking event", () => {
    const evt = {
      event: "thinking",
      data: JSON.stringify({ content: "reasoning..." }),
    };
    const events = parseInternalEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("thinking");
  });

  it("parses finish event", () => {
    const evt = {
      event: "finish",
      data: JSON.stringify({ reason: "stop", usage: { promptTokens: 10 } }),
    };
    const events = parseInternalEvent(evt);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("finish");
  });
});

describe("StreamAccumulator", () => {
  it("accumulates content", () => {
    const acc = new StreamAccumulator();
    acc.addEvent({ type: "content", content: "Hello" });
    acc.addEvent({ type: "content", content: " world" });
    expect(acc.content).toBe("Hello world");
  });

  it("accumulates thinking", () => {
    const acc = new StreamAccumulator();
    acc.addEvent({ type: "thinking", thinking: "let me think" });
    expect(acc.thinking).toBe("let me think");
  });

  it("accumulates tool calls", () => {
    const acc = new StreamAccumulator();
    acc.addEvent({ type: "tool_call_start", toolCall: { id: "c1", name: "calc" } });
    acc.addEvent({ type: "tool_call_delta", toolCall: { arguments: '{"x":' } });
    acc.addEvent({ type: "tool_call_delta", toolCall: { arguments: "1}" } });
    const msg = acc.message();
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0].id).toBe("c1");
    expect(msg.toolCalls[0].name).toBe("calc");
    expect(msg.toolCalls[0].arguments).toBe('{"x":1}');
  });

  it("captures finish reason and usage", () => {
    const acc = new StreamAccumulator();
    acc.addEvent({ type: "finish", finishReason: "stop" });
    acc.addEvent({
      type: "usage",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    const msg = acc.message();
    expect(msg.finishReason).toBe("stop");
    expect(msg.usage?.totalTokens).toBe(15);
  });

  it("returns copy of tool calls", () => {
    const acc = new StreamAccumulator();
    acc.addEvent({ type: "tool_call_start", toolCall: { id: "c1", name: "f" } });
    const calls1 = acc.toolCalls;
    const calls2 = acc.toolCalls;
    expect(calls1).not.toBe(calls2); // different array references
    expect(calls1).toEqual(calls2);
  });
});

describe("detectFormat", () => {
  it("detects OpenAI format", () => {
    const events = [
      { data: '{"object":"chat.completion.chunk","choices":[],"model":"gpt-4o"}' },
    ];
    expect(detectFormat(events)).toBe("openai");
  });

  it("detects Anthropic format", () => {
    const events = [{ event: "message_start", data: '{"type":"message_start"}' }];
    expect(detectFormat(events)).toBe("anthropic");
  });

  it("detects internal format", () => {
    const events = [{ event: "chunk", data: '{"delta":{"content":"hi"}}' }];
    expect(detectFormat(events)).toBe("internal");
  });

  it("defaults to OpenAI", () => {
    const events = [{ data: "malformed" }];
    expect(detectFormat(events)).toBe("openai");
  });
});
