/**
 * 支持的 LLM 提供商
 */
export type LLMProvider = "zhipu" | "openai" | "anthropic";

/**
 * 提供商配置信息
 */
export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

/**
 * 提供商显示信息
 */
export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  defaultModel: string;
  requiresApiKey: boolean;
  available: boolean;
}

/**
 * 所有支持的提供商
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: "zhipu",
    name: "智谱 AI",
    description: "智谱 AI GLM-4 系列模型",
    defaultModel: "glm-4-flash",
    requiresApiKey: true,
    available: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4、GPT-3.5 等模型",
    defaultModel: "gpt-4",
    requiresApiKey: true,
    available: false, // 暂未实现
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 系列模型",
    defaultModel: "claude-3-5-sonnet-20241022",
    requiresApiKey: true,
    available: false, // 暂未实现
  },
];
