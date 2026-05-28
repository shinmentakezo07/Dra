export interface ModelPricing {
  prompt: string | null;
  completion: string | null;
  input_cache_read: string | null;
  input_cache_write: string | null;
  web_search: string | null;
}

export interface ModelArchitecture {
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
}

export interface TopProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

export interface OpenRouterModelData {
  id: string;
  name: string;
  created: number;
  created_date: string | null;
  description: string | null;
  context_length: number | null;
  pricing: ModelPricing;
  architecture: ModelArchitecture | null;
  top_provider: TopProvider | null;
  supported_parameters: string[];
  knowledge_cutoff: string | null;
}

export interface ProviderTheme {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  accent: string;
}
