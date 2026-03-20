import { ZhipuClient } from "./zhipu-client";
import { OcrResult, ReverseResult } from "../types";

/**
 * LLM 逆向分析 Orchestrator
 * 多阶段调用智谱 LLM 进行内容分析
 */
export class LLMOrchestrator {
  private client: ZhipuClient;

  constructor(apiKey: string, model?: string) {
    this.client = new ZhipuClient(apiKey, model);
  }

  /**
   * 从 OCR 结果执行完整的逆向分析
   */
  async reverseFromOcr(ocrResult: OcrResult): Promise<ReverseResult> {
    console.log("[LLMOrchestrator] Starting multi-stage analysis...");

    // 阶段 1：文本清洗与初步结构
    console.log("[LLMOrchestrator] Stage 1: Text cleaning and structure...");
    const stage1Result = await this.stage1_StructureAnalysis(ocrResult);

    // 阶段 2：写作套路分析
    console.log("[LLMOrchestrator] Stage 2: Writing pattern analysis...");
    const writingPatterns = await this.stage2_WritingPatternAnalysis(
      ocrResult,
      stage1Result
    );

    // 阶段 3：Prompt 套餐生成
    console.log("[LLMOrchestrator] Stage 3: Prompt package generation...");
    const prompts = await this.stage3_PromptGeneration(
      stage1Result,
      writingPatterns
    );

    console.log("[LLMOrchestrator] Analysis completed!");

    return {
      summary: stage1Result.summary,
      structure: stage1Result.structure,
      writing_patterns: writingPatterns,
      prompts,
    };
  }

  /**
   * 阶段 1：文本清洗与初步结构分析
   */
  private async stage1_StructureAnalysis(ocrResult: OcrResult) {
    // 拼接所有文本
    const fullText = ocrResult.pages
      .map((page) => `--- PAGE ${page.index} ---\n${page.text}`)
      .join("\n\n");

    // 限制文本长度，避免超出 token 限制
    const truncatedText =
      fullText.length > 8000 ? fullText.slice(0, 8000) + "..." : fullText;

    const systemPrompt = `你是一个专业的内容拆解助手，擅长分析各类内容（文章、社交媒体、博客等）的结构和特点。
请仔细阅读用户提供的内容，并严格按照 JSON 格式返回分析结果。
语言可以用中文。`;

    const userPrompt = `请分析以下内容，返回 JSON 格式的分析结果：

\`\`\`
${truncatedText}
\`\`\`

请返回以下 JSON 格式（不要输出任何其他内容）：
\`\`\`json
{
  "summary": {
    "title_guess": "推测的标题",
    "one_sentence_summary": "一句话总结这个内容讲了什么",
    "content_type": "内容类型（如：种草、教程、故事、清单、分析、观点等）",
    "target_audience": "目标受众是谁"
  },
  "structure": {
    "sections": [
      { "name": "部分名称", "description": "简要描述这部分内容" }
    ],
    "cta": "结尾是否有行动号召（CTA），没有则填'无'"
  }
}
\`\`\``;

    interface Stage1Response {
      summary: {
        title_guess: string;
        one_sentence_summary: string;
        content_type: string;
        target_audience: string;
      };
      structure: {
        sections: Array<{ name: string; description: string }>;
        cta: string;
      };
    }

    return await this.client.chatJson<Stage1Response>(userPrompt, {
      system: systemPrompt,
      temperature: 0.7,
    });
  }

  /**
   * 阶段 2：写作套路分析
   */
  private async stage2_WritingPatternAnalysis(
    ocrResult: OcrResult,
    stage1Result: any
  ): Promise<string[]> {
    // 获取开头、中间、结尾的片段（用于分析套路）
    const firstPage = ocrResult.pages[0]?.text || "";
    const lastPage =
      ocrResult.pages[ocrResult.pages.length - 1]?.text || "";

    const systemPrompt = `你是一个内容创作专家，擅长识别和总结各类内容的写作套路和技巧。
请分析内容的写作手法，返回 2-5 条写作套路总结。`;

    const userPrompt = `基于以下信息，请分析这个内容的写作套路：

内容类型：${stage1Result.summary.content_type}
结构：${stage1Result.structure.sections.map((s: any) => s.name).join(" → ")}
CTA：${stage1Result.structure.cta}

开头片段：
\`\`\`
${firstPage.slice(0, 500)}...
\`\`\`

结尾片段：
\`\`\`
...${lastPage.slice(-500)}
\`\`\`

请返回 JSON 格式（不要输出任何其他内容）：
\`\`\`json
{
  "writing_patterns": [
    "写作套路1：具体描述",
    "写作套路2：具体描述",
    "写作套路3：具体描述"
  ]
}
\`\`\``;

    interface Stage2Response {
      writing_patterns: string[];
    }

    const result = await this.client.chatJson<Stage2Response>(userPrompt, {
      system: systemPrompt,
      temperature: 0.8,
    });

    return result.writing_patterns;
  }

  /**
   * 阶段 3：Prompt 套餐生成
   */
  private async stage3_PromptGeneration(
    stage1Result: any,
    writingPatterns: string[]
  ): Promise<Array<{ name: string; description: string; prompt_text: string }>> {
    const systemPrompt = `你是一个 Prompt Engineering 专家，擅长根据内容分析生成高质量的 AI 提示词。
请生成可以直接复制使用的 Prompt 模板。`;

    const userPrompt = `基于以下内容分析结果，请生成 3 个高质量的 Prompt 套餐：

内容信息：
- 类型：${stage1Result.summary.content_type}
- 受众：${stage1Result.summary.target_audience}
- 结构：${stage1Result.structure.sections.map((s: any) => s.name).join(" → ")}
- 写作套路：
${writingPatterns.map((p) => `  - ${p}`).join("\n")}

请返回 JSON 格式（不要输出任何其他内容）：
\`\`\`json
{
  "prompts": [
    {
      "name": "生成类似结构的内容",
      "description": "让 AI 按照这个内容的结构和语气写新内容",
      "prompt_text": "完整的 Prompt 文本，包含必要的上下文和指令..."
    },
    {
      "name": "生成多个新选题",
      "description": "基于这个内容的选题方法，生成 10 个新选题",
      "prompt_text": "完整的 Prompt 文本..."
    },
    {
      "name": "跨平台改写",
      "description": "将这个内容的结构应用到其他平台",
      "prompt_text": "完整的 Prompt 文本..."
    }
  ]
}
\`\`\`

要求：
1. 每个 prompt_text 都应该是完整、可直接使用的
2. 使用 {变量} 的方式标记需要用户填写的参数
3. Prompt 应该包含清晰的指令和上下文
4. 语言自然流畅，符合中文表达习惯`;

    interface Stage3Response {
      prompts: Array<{
        name: string;
        description: string;
        prompt_text: string;
      }>;
    }

    const result = await this.client.chatJson<Stage3Response>(userPrompt, {
      system: systemPrompt,
      temperature: 0.9,
      maxTokens: 12000, // Prompt 生成需要更多 tokens
    });

    return result.prompts;
  }
}
