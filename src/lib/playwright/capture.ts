import { chromium, Browser, Page, BrowserContext } from "playwright";
import path from "path";
import { mkdir } from "fs/promises";

/**
 * 页面内容提取结果
 */
export interface PageContentResult {
  url: string;
  title: string;
  text: string;
  screenshotPath?: string;
}

/**
 * Playwright 页面内容提取模块
 */
export class PlaywrightCapture {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * 初始化浏览器
   */
  async init(): Promise<void> {
    if (this.browser) return;

    const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";

    this.browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // 创建上下文，配置视口和 UA
    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "zh-CN",
    });
  }

  /**
   * 提取页面内容（文本 + 可选截图）
   */
  async extractPageContent(url: string, taskId: string, takeScreenshot: boolean = true): Promise<PageContentResult> {
    if (!this.browser || !this.context) {
      await this.init();
    }

    // 创建临时目录
    const tmpDir = path.join(process.cwd(), "tmp", taskId);
    await mkdir(tmpDir, { recursive: true });

    const page = await this.context!.newPage();

    try {
      console.log(`[Playwright] Loading page: ${url}`);

      // 访问页面
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || "30000"),
      });

      // 获取页面标题
      const title = await page.title();

      // 滚动页面以确保加载所有内容
      await this.scrollPage(page);

      // 提取页面文本
      const text = await this.extractText(page);

      console.log(`[Playwright] Extracted text length: ${text.length}`);

      // 可选：保存截图
      let screenshotPath: string | undefined;
      if (takeScreenshot) {
        screenshotPath = path.join(tmpDir, "shot_1.png");
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
        console.log(`[Playwright] Screenshot saved: ${screenshotPath}`);
      }

      return {
        url,
        title,
        text,
        screenshotPath,
      };
    } catch (error) {
      console.error(`[Playwright] Error extracting content:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * 滚动页面以加载所有内容
   */
  private async scrollPage(page: Page): Promise<void> {
    console.log("[Playwright] Scrolling page to load all content...");

    // 获取页面高度
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 900;
    const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

    // 分步滚动
    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
      // 等待内容加载
      await page.waitForTimeout(500);
    }

    // 滚动回顶部
    await page.evaluate(() => window.scrollTo(0, 0));

    console.log("[Playwright] Page scrolling completed");
  }

  /**
   * 提取页面文本
   */
  private async extractText(page: Page): Promise<string> {
    console.log("[Playwright] Extracting page text...");

    // 提取所有可见文本
    const text = await page.evaluate(() => {
      // 移除不需要的元素
      const selectorsToRemove = [
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",
        "nav",
        "footer",
      ];

      selectorsToRemove.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // 获取主要内容
      const bodyText = document.body?.innerText || "";
      return bodyText;
    });

    // 清洗文本
    return this.cleanText(text);
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
        // 合并过短的行
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
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// 导出单例
export const playwrightCapture = new PlaywrightCapture();
