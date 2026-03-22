/**
 * 智谱 AI API 客户端
 */
export class ZhipuClient {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "glm-4";
  }

  /**
   * 调用智谱 API
   */
  async chat(
    prompt: string,
    options?: { system?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const { system, temperature = 0.7, maxTokens = 8000 } = options || {};

    const messages: Array<{ role: string; content: string }> = [];

    if (system) {
      messages.push({ role: "system", content: system });
    }

    messages.push({ role: "user", content: prompt });

    console.log(`[ZhipuClient] Sending request to ${this.model}...`);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Zhipu API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message.content;
        console.log(`[ZhipuClient] Response received, length: ${content.length}`);
        return content;
      }

      throw new Error("No response from Zhipu API");
    } catch (error) {
      console.error("[ZhipuClient] Error:", error);
      throw error;
    }
  }

  /**
   * 调用智谱 API，要求返回 JSON 格式
   */
  async chatJson<T>(
    prompt: string,
    options?: { system?: string; temperature?: number; maxTokens?: number }
  ): Promise<T> {
    const systemPrompt =
      options?.system ||
      "你是一个专业的助手，请严格按照 JSON 格式返回结果。不要输出任何其他内容。";

    const enhancedPrompt = `${prompt}\n\n请严格按照以下 JSON 格式返回结果，不要输出任何其他内容：`;

    const response = await this.chat(enhancedPrompt, {
      system: systemPrompt,
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens,
    });

    // 尝试解析 JSON
    try {
      // 移除可能的 markdown 代码块标记
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      return JSON.parse(cleanedResponse) as T;
    } catch (error) {
      console.error("[ZhipuClient] Failed to parse JSON:", error);
      console.error("[ZhipuClient] Response was:", response);
      throw new Error("Failed to parse JSON response from LLM");
    }
  }
}
