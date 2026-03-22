import { createWorker, recognize } from "tesseract.js";
import { OcrResult, OcrScreenshotInput } from "../types";
import * as fs from "fs/promises";

/**
 * Tesseract OCR 模块
 */
export class TesseractOcr {
  private worker: any = null;

  /**
   * 初始化 Tesseract worker
   */
  async init(): Promise<void> {
    if (this.worker) return;

    console.log("[Tesseract] Initializing worker...");

    try {
      this.worker = await createWorker(process.env.TESSERACT_LANGUAGE || "chi_sim+eng", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      console.log("[Tesseract] Worker initialized");
    } catch (error) {
      console.error("[Tesseract] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * 执行 OCR 识别
   */
  async recognizeScreenshots(
    url: string,
    screenshots: OcrScreenshotInput[]
  ): Promise<OcrResult> {
    if (!this.worker) {
      await this.init();
    }

    console.log(`[Tesseract] Recognizing ${screenshots.length} screenshot(s)...`);

    const pages: { index: number; text: string }[] = [];

    for (const screenshot of screenshots) {
      console.log(`[Tesseract] Processing screenshot ${screenshot.index}...`);

      try {
        // 检查文件是否存在
        try {
          await fs.access(screenshot.path);
        } catch {
          console.error(`[Tesseract] File not found: ${screenshot.path}`);
          continue;
        }

        // 使用 worker 识别
        const { data } = await this.worker.recognize(screenshot.path);

        // 清洗文本
        const cleanedText = this.cleanText(data.text);

        pages.push({
          index: screenshot.index,
          text: cleanedText,
        });

        console.log(
          `[Tesseract] Screenshot ${screenshot.index} completed, text length: ${cleanedText.length}`
        );
      } catch (error) {
        console.error(
          `[Tesseract] Error processing screenshot ${screenshot.index}:`,
          error
        );
        // 继续处理下一张截图
      }
    }

    // 按 index 排序
    pages.sort((a, b) => a.index - b.index);

    console.log("[Tesseract] All screenshots processed");

    return {
      url,
      pages,
    };
  }

  /**
   * 清洗文本
   */
  private cleanText(text: string): string {
    return (
      text
        // 移除完全空行
        .split("\n")
        .filter((line) => line.trim().length > 0)
        // 合并过短的行（可能是 OCR 错误）
        .reduce((lines: string[], line: string) => {
          const trimmedLine = line.trim();
          if (trimmedLine.length < 5 && lines.length > 0) {
            // 合并到上一行
            lines[lines.length - 1] += trimmedLine;
          } else {
            lines.push(trimmedLine);
          }
          return lines;
        }, [])
        .join("\n")
    );
  }

  /**
   * 终止 worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      console.log("[Tesseract] Worker terminated");
    }
  }
}

// 导出单例
export const tesseractOcr = new TesseractOcr();
