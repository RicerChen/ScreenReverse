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
      // 避免被识别为机器人
      extraHTTPHeaders: {
        "Accept-Language": "zh-CN,zh;q=0.9",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
      },
    });

    // 屏蔽 navigator.webdriver
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
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

      // 处理特定平台
      await this.handleSpecialPlatforms(page, url);

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
   * 处理特定平台的特殊逻辑
   */
  private async handleSpecialPlatforms(page: Page, url: string): Promise<void> {
    if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) {
      console.log("[Playwright] Handling Xiaohongshu specific logic...");
      try {
        // 等待内容加载（支持多个可能的选择器）
        await Promise.race([
          page.waitForSelector(".note-content", { timeout: 10000 }),
          page.waitForSelector(".desc", { timeout: 10000 }),
          page.waitForSelector(".content", { timeout: 10000 }),
          page.waitForSelector(".title", { timeout: 10000 }),
        ]);

        // 尝试关闭登录弹窗（如果存在）
        const loginCloseBtn = await page.$(".close-icon, .close-btn, .login-close-btn");
        if (loginCloseBtn) {
          await loginCloseBtn.click();
          console.log("[Playwright] Closed login modal");
        }

        // 展开“查看更多”或长文内容
        const readMoreBtn = await page.$(".read-more, .show-more");
        if (readMoreBtn) {
          await readMoreBtn.click();
          console.log("[Playwright] Clicked 'read more' button");
          await page.waitForTimeout(1000); // 等待内容展开
        }
      } catch (e) {
        console.log(
          "[Playwright] Xiaohongshu specific selector not found, proceeding anyway..."
        );
      }
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

      // 提取主要内容（针对内容平台优化）
      const contentSelectors = [
        ".note-content", // 小红书
        ".desc",         // 小红书
        ".content",      // 常用
        ".title",        // 常用
        "article",       // 通用文章
        ".post-content", // 博客
        ".rich_media_content", // 微信公众号
      ];

      let mainTextParts: string[] = [];

      // 尝试提取标题
      const titleSelectors = ["h1", ".title", ".note-title"];
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent?.trim()) {
          mainTextParts.push(el.textContent.trim());
          break;
        }
      }

      // 尝试提取正文内容
      let contentFound = false;
      for (const selector of contentSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            if (el.textContent?.trim()) {
              mainTextParts.push(el.textContent.trim());
              contentFound = true;
            }
          });
          if (contentFound) break;
        }
      }

      // 如果没找到特定选择器的内容，退回到 body 文本
      if (mainTextParts.length === 0) {
        return document.body?.innerText || "";
      }

      return mainTextParts.join("\n\n");
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
        // 去除每行首尾空格
        .map((line) => line.trim())
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
