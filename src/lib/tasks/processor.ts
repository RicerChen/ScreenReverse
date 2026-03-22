import { taskStore } from "./store";
import { playwrightCapture } from "../playwright/capture";
import { LLMOrchestrator } from "../llm/orchestrator";
import { Task, OcrResult } from "../types";

/**
 * 任务处理器
 * 整合所有模块，执行完整的任务流水线
 */
export class TaskProcessor {
  private maxConcurrentTasks: number;
  private activeTaskCount = 0;
  private queue: string[] = [];

  constructor() {
    this.maxConcurrentTasks =
      parseInt(process.env.MAX_CONCURRENT_TASKS || "3", 10);
  }

  /**
   * 处理单个任务
   */
  async processTask(taskId: string): Promise<void> {
    // 检查并发限制
    if (this.activeTaskCount >= this.maxConcurrentTasks) {
      console.log(`[TaskProcessor] Task ${taskId} queued`);
      this.queue.push(taskId);
      return;
    }

    this.activeTaskCount++;
    const task = taskStore.getTask(taskId);

    if (!task) {
      console.error(`[TaskProcessor] Task ${taskId} not found`);
      this.activeTaskCount--;
      return;
    }

    console.log(`[TaskProcessor] Processing task ${taskId}`);

    try {
      // 阶段 1：提取页面内容
      await this.processPageExtraction(task);

      // 阶段 2：LLM 分析
      await this.processLLMAnalysis(task);

      console.log(`[TaskProcessor] Task ${taskId} completed successfully`);
    } catch (error) {
      console.error(`[TaskProcessor] Task ${taskId} failed:`, error);
      taskStore.setTaskError(
        taskId,
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.activeTaskCount--;
      this.processNextTask();
    }
  }

  /**
   * 处理页面内容提取阶段
   */
  private async processPageExtraction(task: Task): Promise<void> {
    try {
      console.log(`[TaskProcessor] Stage 1: Extracting page content for ${task.taskId}`);
      taskStore.updateTaskStatus(task.taskId, "page_loading", "正在打开页面...");

      const pageContent = await playwrightCapture.extractPageContent(
        task.url,
        task.taskId,
        true // 保存截图
      );

      // 转换为 OCR 结果格式（兼容 LLM Orchestrator）
      const ocrResult: OcrResult = {
        url: pageContent.url,
        pages: [
          {
            index: 1,
            text: pageContent.text,
          },
        ],
      };

      // 保存结果到任务（临时存储）
      (task as any).ocrResult = ocrResult;

      taskStore.updateTaskStatus(
        task.taskId,
        "ocr",
        `文本提取完成，共 ${pageContent.text.length} 个字符`
      );
    } catch (error) {
      throw new Error(
        `页面内容提取失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 处理 LLM 分析阶段
   */
  private async processLLMAnalysis(task: Task): Promise<void> {
    try {
      console.log(`[TaskProcessor] Stage 2: LLM Analysis for ${task.taskId}`);
      taskStore.updateTaskStatus(
        task.taskId,
        "analyzing",
        "正在进行逆向分析..."
      );

      // 确定使用的 API key
      const apiKey = task.apiKey || process.env.ZHIPU_API_KEY;
      const model = task.model || process.env.ZHIPU_MODEL;

      if (!apiKey) {
        throw new Error("API key not configured. Please configure it in settings.");
      }

      // 为每个任务创建独立的 LLM Orchestrator
      const orchestrator = new LLMOrchestrator(apiKey, model);

      const ocrResult = (task as any).ocrResult;

      if (!ocrResult) {
        throw new Error("OCR result not found");
      }

      const reverseResult = await orchestrator.reverseFromOcr(ocrResult);

      // 保存最终结果
      taskStore.setTaskResult(task.taskId, reverseResult);

      console.log(
        `[TaskProcessor] Task ${task.taskId} analysis completed:`,
        reverseResult
      );
    } catch (error) {
      throw new Error(
        `分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 处理下一个排队任务
   */
  private processNextTask(): void {
    if (this.queue.length > 0 && this.activeTaskCount < this.maxConcurrentTasks) {
      const nextTaskId = this.queue.shift();
      if (nextTaskId) {
        console.log(`[TaskProcessor] Processing queued task ${nextTaskId}`);
        this.processTask(nextTaskId);
      }
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await playwrightCapture.close();
  }
}

// 导出单例
export const taskProcessor = new TaskProcessor();
