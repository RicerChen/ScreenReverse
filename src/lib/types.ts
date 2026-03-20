/**
 * 任务状态枚举
 */
export type TaskStatus =
  | "queueing"
  | "page_loading"
  | "screenshotting"
  | "ocr"
  | "analyzing"
  | "done"
  | "failed";

/**
 * 任务信息
 */
export interface Task {
  taskId: string;
  url: string;
  status: TaskStatus;
  progress?: string;
  result?: ReverseResult;
  error?: string;
  createdAt: number;
  provider?: string;
  apiKey?: string;
  model?: string;
}

/**
 * 截图结果
 */
export interface ScreenshotResult {
  screenshots: { index: number; path: string }[];
  meta: {
    url: string;
    title?: string;
    viewport: { width: number; height: number };
    timestamp: string;
  };
}

/**
 * OCR 输入
 */
export interface OcrScreenshotInput {
  index: number;
  path: string;
}

/**
 * OCR 结果
 */
export interface OcrResult {
  url: string;
  pages: { index: number; text: string }[];
}

/**
 * 内容摘要
 */
export interface Summary {
  title_guess: string;
  one_sentence_summary: string;
  content_type: string;
  target_audience: string;
}

/**
 * 内容结构
 */
export interface Structure {
  sections: { name: string; description: string }[];
  cta: string;
}

/**
 * Prompt 套餐
 */
export interface Prompt {
  name: string;
  description: string;
  prompt_text: string;
}

/**
 * 逆向分析结果
 */
export interface ReverseResult {
  summary: Summary;
  structure: Structure;
  writing_patterns: string[];
  prompts: Prompt[];
}

/**
 * API 请求类型
 */
export interface CreateTaskRequest {
  url: string;
  provider?: string;
  apiKey?: string;
  model?: string;
}

export interface CreateTaskResponse {
  taskId: string;
}

export interface GetTaskResponse {
  taskId: string;
  url: string;
  status: TaskStatus;
  progress?: string;
  result?: ReverseResult;
  error?: string | null;
}
