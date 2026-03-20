***

# ScreenReverse 项目开发文档 v1  
（方案 B：Playwright 截屏 + OCR + 智谱 LLM 逆向）

## 0. 项目概述

**项目名称**：ScreenReverse（暂定）  
**一句话定位**：  
> 用户贴一个内容链接（小红书/公众号/博客等），系统自动用 Playwright 打开页面、截图、OCR 出文字，再用智谱 LLM 做内容结构拆解和 prompt 逆向，输出“拆解报告 + 可复用 prompt 套餐”。

**目标用户**：  
- 内容创作者、运营、短视频/图文博主  
- 产品/市场/竞品分析同学  
- 想学习“爆款内容写法和 prompt 的人”

**核心价值**：  
- 把别人内容“拆成方法论 + 模板化 prompt”，降低“照着学”的门槛。  
- 先支持文本/图文类页面，后续可扩展到更多平台与输入形态。

***

## 1. 整体架构

### 1.1 技术栈建议

可以按你熟悉的来，这里给一个参考（可让 cc 自己选具体框架）：

- 前端：Next.js / React（简单表单 + 结果页即可）  
- 后端：Node.js（Express / Fastify）或 Python（FastAPI）  
- 浏览器自动化：Playwright（Chromium）  
- OCR：PaddleOCR/本地 OCR 服务/第三方 OCR API（三选一）  
- LLM：智谱 GLM 系列在线 API（如 `glm-4`）

### 1.2 模块划分

- `web/`：Web 前端  
- `server/`：后端 API  
  - `playwright/`：页面打开 + 截图模块  
  - `ocr/`：截图 OCR 模块  
  - `llm/`：智谱 LLM 客户端 + 逆向 orchestrator  
  - `jobs/`：任务管理（简单队列/状态记录）

***

## 2. 用户流程（User Flow）

1. 用户进入 Web 页，看到一个输入框：  
   - 填入链接（如小红书分享链接、公众号文章链接、普通博客链接）。  
2. 点击“开始逆向”按钮。  
3. 前端调用后端 API 创建任务，后端：  
   - 用 Playwright 打开该链接，加载完成后自动滚动并截图（优先尝试 fullPage 截图，失败则按视窗分段截多张）。  
   - 对截图执行 OCR，获得文本。  
   - 把文本交给智谱 LLM 多阶段分析，生成结构化的“拆解报告 + prompt 套餐”。  
4. 前端轮询/长轮询任务状态，完成后展示结果：  
   - 内容摘要与结构  
   - 写作套路分析  
   - 1–3 个可直接复制的 prompt（有名字，有说明）  

***

## 3. 功能需求（详细）

### 3.1 前端功能

#### 3.1.1 链接输入页

- 组件：  
  - 输入框：`Content URL`  
  - 按钮：`Start Reverse` / `开始逆向`  
- 校验：  
  - 非空  
  - 基本 URL 格式（`https://` 起）  
- 行为：  
  - 点击按钮 → POST `/api/tasks`，Body 为 `{ url }`  
  - 获取任务 ID 后跳转到 `/task/{taskId}` 结果页

#### 3.1.2 任务结果页

- 路由：`/task/[taskId]`  
- 加载逻辑：  
  - 轮询 GET `/api/tasks/{taskId}`，例如 2 秒一次，直到状态为 `done` 或 `failed`。  
- 显示内容（状态为 `processing` 时）：
  - 显示进度提示：  
    - `queueing`：排队中  
    - `page_loading`：正在打开页面  
    - `screenshotting`：正在截屏  
    - `ocr`：正在提取文本  
    - `analyzing`：正在逆向分析  
- 显示内容（状态为 `done` 时）：  
  - 摘要卡片：  
    - 猜测标题  
    - 一句话总结  
    - 内容类型  
    - 目标受众  
  - 结构拆解：  
    - 内容结构（如 Hook / Body / CTA，简要描述）  
    - 关键要点列表（2–5 条）  
  - 写作套路分析：  
    - 列表形式，每条说明一种套路（如“先放痛点，再给解决方案清单，再给 CTA”）  
  - Prompt 套餐：  
    - 每个 prompt：  
      - 名称（如“生成类似结构的内容”）  
      - 简短说明  
      - 可复制文本框（完整 prompt）  
- 显示内容（状态为 `failed` 时）：  
  - 错误信息简述（如“页面无法访问 / 截图失败 / OCR 失败 / 分析失败”）  
  - 返回首页按钮  

***

### 3.2 后端功能

#### 3.2.1 任务管理 API

- `POST /api/tasks`  
  - Request：`{ "url": "https://..." }`  
  - Response：`{ "taskId": "<uuid>" }`  
  - 行为：  
    - 创建任务记录：状态 `queueing`，存下 URL。  
    - 推入简单队列（可以用内存队列/MQ，MVP 用内存即可）。  

- `GET /api/tasks/{taskId}`  
  - Response 示例：  

    ```json
    {
      "taskId": "xxx",
      "url": "https://...",
      "status": "analyzing", 
      "progress": "OCR finished, analyzing with LLM",
      "result": { ... }, 
      "error": null
    }
    ```

  - `status` 可选值：  
    - `queueing`  
    - `page_loading`  
    - `screenshotting`  
    - `ocr`  
    - `analyzing`  
    - `done`  
    - `failed`  

  - `result` 字段在 `done` 时为结构化 JSON，格式见 3.4。  
  - `error` 在 `failed` 时存具体错误信息或错误代码。

#### 3.2.2 任务处理 Worker（核心流水线）

可以是一个后台循环/定时器，也可以由请求触发（MVP 简单些）：

流程：

1. 从队列取一个任务，置状态为 `page_loading`。  
2. 调用 Playwright 截图模块：  
   - 如果成功，状态 → `screenshotting`（可合并成一步）。  
   - 失败则状态 → `failed`，记录错误。  
3. 截图成功后，状态 → `ocr`，调用 OCR 模块：  
   - 成功则拿到 OCR 文本，存任务临时数据。  
   - 失败则 `failed`。  
4. 状态 → `analyzing`，调用 LLM orchestrator：  
   - 成功则得到最终 `result` JSON，状态 → `done`。  
   - 失败则 → `failed`。  

***

### 3.3 Playwright 截图模块

**目标**：给定 URL，生成尽量完整的页面截图（优先 fullPage，不行再多图）。

#### 3.3.1 接口定义（伪代码）

```ts
interface ScreenshotResult {
  screenshots: { index: number; path: string }[];
  meta: {
    url: string;
    title?: string;
    viewport: { width: number; height: number };
    timestamp: string;
  };
}

async function capturePageScreenshots(url: string): Promise<ScreenshotResult> { ... }
```

#### 3.3.2 实现要求

- 使用 Playwright Chromium。  
- 默认视口：例如 1440x900。  
- 设置常见 UA、语言等 header 模拟真实浏览器。  
- 打开页面：  
  - `page.goto(url, { waitUntil: 'networkidle', timeout: ... })`  
  - 若超时或失败，抛出错误。  
- 尝试 `page.screenshot({ fullPage: true })`：  
  - 成功则返回一张图 `shot_1.png`。  
  - 若 fullPage 不可用（如某些长页面异常），fallback：  
    - 获取 `scrollHeight`，按视窗高度逐段滚动，循环截图 `shot_1.png, shot_2.png...`。  
- 截图文件存到临时目录（如 `tmp/{taskId}/shot_1.png`）。  
- 返回截图路径列表及 meta 信息。  

***

### 3.4 OCR 模块

**目标**：把一组截图转换为可用的文本。

#### 3.4.1 接口定义

```ts
interface OcrScreenshotInput {
  index: number;
  path: string;
}

interface OcrResult {
  url: string;
  pages: { index: number; text: string }[];
}

async function runOcrOnScreenshots(
  url: string,
  screenshots: OcrScreenshotInput[]
): Promise<OcrResult> { ... }
```

#### 3.4.2 实现要求

- 使用 PaddleOCR / 其他开源 OCR 或第三方 API。  
- 要求支持中英文混排。  
- 对每张图片：  
  - 调 OCR，拿到文本。  
  - 不强求坐标结构，MVP 只要拿到文本即可。  
- 输出格式：  
  - `pages` 数组按 index 排序。  
  - 每页 text 内部处理：  
    - 去掉完全空行  
    - 合并过短行（可选）  

示例输出：

```json
{
  "url": "https://example.com",
  "pages": [
    { "index": 1, "text": "标题...\n内容..." },
    { "index": 2, "text": "更多内容..." }
  ]
}
```

***

### 3.5 LLM 逆向分析模块（智谱）

#### 3.5.1 LLM Client 封装

提供一个统一的客户端，例如：

```ts
class ZhipuClient {
  constructor(apiKey: string, model: string) {}

  async chat(prompt: string, options?: { system?: string }): Promise<string> { ... }
}
```

在 config 中通过环境变量配置：

- `ZHIPU_API_KEY`  
- `ZHIPU_MODEL`（如 `glm-4`）

#### 3.5.2 Orchestrator 总体接口

```ts
interface ReverseResult {
  summary: {
    title_guess: string;
    one_sentence_summary: string;
    content_type: string;
    target_audience: string;
  };
  structure: {
    sections: { name: string; description: string }[];
    cta: string;
  };
  writing_patterns: string[];
  prompts: {
    name: string;
    description: string;
    prompt_text: string;
  }[];
}

async function reverseFromOcr(ocrResult: OcrResult): Promise<ReverseResult> { ... }
```

#### 3.5.3 多阶段调用设计

**步骤 1：文本清洗与初步结构**

输入：`ocrResult`（包含 `pages` 文本）  
- 把所有页文本拼接成一个长文本（中间加入标记，如 `--- PAGE 1 ---`）。  
- 调用智谱：  
  - system prompt：  
    - “你是一个内容拆解助手，只输出指定的 JSON。语言可以用中文。”  
  - user prompt 大致结构：  
    - 给用户完整文本  
    - 让模型返回：  
      - 猜测标题  
      - 一句话总结  
      - 初步内容类型  
      - 初步切分结构（大致分为几个部分，每部分简要描述）  
      - 结尾是否有明显 CTA  

输出：一个 JSON，Orchestrator 转成内部结构，如：

```json
{
  "title_guess": "...",
  "one_sentence_summary": "...",
  "content_type": "...",
  "target_audience": "...",
  "sections": [
    { "name": "Hook", "description": "..." },
    { "name": "Body", "description": "..." }
  ],
  "cta": "..."
}
```

**步骤 2：写作套路分析**

输入：步骤 1 的结构化结果 + 部分原文片段（前/中/后）  
- 调用智谱，要求输出：  
  - 2–5 条写作套路总结，每条一句话，专注于“怎么写”的方法。  

**步骤 3：Prompt 套餐生成**

输入：前两步结果（结构 + 套路），不再放完整原文，避免浪费 tokens：

- 让智谱输出一个 JSON，包含多条 prompt：  
  - Prompt 1：“生成类似结构的内容”  
    - 描述：复刻结构 & 语气；参数包括 `{主题}` `{目标受众}` `{平台}`。  
  - Prompt 2：“生成多个选题”  
    - 描述：基于当前内容的选题方法，生成 10 个新选题。  
  - Prompt 3（可选）：“跨平台改写”  
    - 描述：把这套结构应用到其他平台写作。

#### 3.5.4 输出 Schema（给前端）

最终 `ReverseResult` 结构如：

```json
{
  "summary": {
    "title_guess": "可能的标题",
    "one_sentence_summary": "一句话总结",
    "content_type": "种草/教程/故事/清单/分析 等",
    "target_audience": "目标受众描述"
  },
  "structure": {
    "sections": [
      { "name": "Hook", "description": "..." },
      { "name": "正文段落", "description": "..." }
    ],
    "cta": "结尾的行动号召"
  },
  "writing_patterns": [
    "写作套路1",
    "写作套路2"
  ],
  "prompts": [
    {
      "name": "生成类似结构的内容",
      "description": "让模型按该文章结构和语气写新内容",
      "prompt_text": "可直接复制的完整 prompt ..."
    },
    {
      "name": "生成多个新选题",
      "description": "基于该内容的选题方法，延展出10个新选题",
      "prompt_text": "..."
    }
  ]
}
```

***

## 4. 配置与部署

### 4.1 环境变量

- `ZHIPU_API_KEY`（必填）  
- `ZHIPU_MODEL`（默认 `glm-4`）  
- 可选：  
  - `PORT`（后端端口）  
  - `PLAYWRIGHT_BROWSER_PATH`（如需自定义）  

### 4.2 开发环境

- 本地需要安装：  
  - Node.js 或 Python  
  - Playwright（`npx playwright install` 或等效）  
  - OCR 引擎依赖（若用 PaddleOCR，需要 Python 环境和依赖包）  

### 4.3 启动流程（README 要写清楚）

示例（Node + Python 混合时）：

1. 克隆仓库  
2. 配置 `.env`（写上智谱 key）  
3. 安装依赖：  
   - `npm install`  
   - `pip install -r requirements.txt`（如 OCR 用 Python）  
4. 启动后端：`npm run dev` / `pnpm dev`  
5. 启动前端：`npm run dev:web`（如果分仓的话）  

***

## 5. 非功能需求

- **性能**：  
  - 单次任务耗时控制在 20–40 秒内可接受。  
  - 提醒：LLM/Playwright/OCR 都是重操作，注意时间outs 和重试。  

- **健壮性**：  
  - Playwright 打不开页面 ⇒ 返回平台提示“无法自动访问，可考虑未来支持上传截图”。  
  - OCR 出错 ⇒ 返回“文本提取失败”。  
  - LLM 出错 ⇒ 返回“分析失败”。  

- **日志**：  
  - 对每个任务记录各阶段耗时和错误，方便排查。  

- **隐私与合规**：  
  - 截图和 OCR 文本默认只保留短时间（例如 24 小时）用于调试，后续可配置清理。  
  - README 中写明：只处理用户主动提供的链接/内容，不进行后台大规模爬取。  

***

## 6. MVP 范围（一定要先做的）

1. 前端：  
   - URL 输入页 + 任务结果页（轮询）。  
2. 后端：  
   - 单任务流水线：  
     - Playwright fullPage 截一张图（只要能跑就行）。  
     - 简单 OCR（哪怕先用一个第三方 API 也行）。  
     - 智谱 LLM 单次调用（哪怕先合并成一步）输出：  
       - 一句话总结  
       - 内容类型  
       - 1 条结构描述  
       - 1 条 prompt  
