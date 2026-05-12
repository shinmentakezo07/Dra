export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelId?: string;
}

export interface ChatSession {
  id: string;
  model: EnrichedModel;
  messages: Message[];
  isTyping: boolean;
}

export interface HistoryChat {
  id: string;
  title: string;
  sharedMessages: Message[];
  sessions: ChatSession[];
  selectedModels: EnrichedModel[];
  updatedAt: number;
}

export interface EnrichedModel {
  id: string;
  name: string;
  logo?: string | null;
  provider: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  description?: string;
}
