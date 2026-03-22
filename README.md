# ScreenReverse - 内容逆向分析工具

> 用户输入链接，系统自动截图、OCR 提取文本、用智谱 LLM 分析，输出内容拆解报告和可复用的 Prompt 套餐。

## 功能特点

- 🔗 **一键分析**：输入链接，自动完成截图、OCR、AI 分析全流程
- 🤖 **AI 驱动**：使用智谱 GLM-4 进行深度内容分析
- 📊 **结构拆解**：自动识别内容结构、写作套路
- 🎯 **Prompt 生成**：生成可直接复用的 AI Prompt 模板
- 🎨 **精美 UI**：基于 Next.js + Tailwind CSS 构建的现代化界面

## 技术栈

- **前端**：Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **后端**：Next.js API Routes
- **浏览器自动化**：Playwright (Chromium)
- **OCR**：Tesseract.js
- **LLM**：智谱 GLM-4 API

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 安装步骤

1. **克隆仓库**

   ```bash
   cd /path/to/ScreenReverse
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **安装 Playwright 浏览器**

   ```bash
   npm run playwright:install
   ```

4. **配置环境变量**

   创建 `.env.local` 文件：

   ```env
   # 智谱 AI
   ZHIPU_API_KEY=your_zhipu_api_key_here
   ZHIPU_MODEL=glm-4.7-flash

   # 应用配置
   PORT=3000
   NODE_ENV=development

   # Playwright
   PLAYWRIGHT_HEADLESS=true
   PLAYWRIGHT_TIMEOUT=30000

   # 任务配置
   TASK_TIMEOUT=120000
   TASK_CLEANUP_TTL=86400000
   MAX_CONCURRENT_TASKS=3

   # OCR
   TESSERACT_LANGUAGE=chi_sim+eng
   ```

5. **启动开发服务器**

   ```bash
   npm run dev
   ```

6. **访问应用**

   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. 输入想要分析的内容链接（支持小红书、公众号、博客等）
2. 点击"开始逆向"按钮
3. 等待系统自动处理（截图 → OCR → AI 分析）
4. 查看分析结果：
   - 📋 内容摘要
   - 🏗️ 结构拆解
   - ✍️ 写作套路
   - 🎯 Prompt 套餐（可复制使用）

## 项目结构

```
ScreenReverse/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # 首页
│   │   ├── task/[taskId]/        # 任务结果页
│   │   └── api/tasks/            # API Routes
│   ├── components/               # React 组件
│   └── lib/                      # 核心业务逻辑
│       ├── types.ts              # 类型定义
│       ├── playwright/           # 截图模块
│       ├── ocr/                  # OCR 模块
│       ├── llm/                  # LLM 模块
│       └── tasks/                # 任务管理
└── public/                       # 静态资源
```

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 安装 Playwright 浏览器
npm run playwright:install

# 代码检查
npm run lint
```

## 部署

### 本地部署

1. 构建项目：`npm run build`
2. 启动服务器：`npm start`

### Docker 部署（推荐）

由于 Playwright 需要 Chromium，建议使用 Docker 容器部署：

```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 推荐平台

- **Render**：支持 Docker，有免费额度
- **Railway**：支持 Docker，自动部署
- **自托管**：使用 Docker Compose

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ZHIPU_API_KEY` | 智谱 AI API 密钥（必填） | - |
| `ZHIPU_MODEL` | 智谱模型名称 | `glm-4.7-flash` |
| `PORT` | 应用端口 | `3000` |
| `PLAYWRIGHT_HEADLESS` | 是否无头模式运行浏览器 | `true` |
| `PLAYWRIGHT_TIMEOUT` | 页面加载超时（毫秒） | `30000` |
| `TASK_TIMEOUT` | 任务超时（毫秒） | `120000` |
| `MAX_CONCURRENT_TASKS` | 最大并发任务数 | `3` |
| `TESSERACT_LANGUAGE` | OCR 语言包 | `chi_sim+eng` |

## 注意事项

1. **智谱 API Key**：需要到 [智谱 AI 开放平台](https://open.bigmodel.cn/) 申请
2. **浏览器依赖**：Playwright 需要安装 Chromium，确保网络畅通
3. **OCR 性能**：Tesseract.js 首次运行会下载语言包，可能较慢
4. **任务超时**：某些页面加载较慢，可能需要调整超时时间
5. **并发限制**：建议根据服务器配置调整并发任务数

## 常见问题

**Q: Playwright 在 Vercel 等 Serverless 环境无法运行？**

A: 是的，Playwright 需要 Chromium，不支持 Serverless 环境。建议使用 Docker 容器部署到 Render/Railway 等平台。

**Q: OCR 准确率不高？**

A: Tesseract.js 是开源方案，准确率有限。可以升级到 PaddleOCR 或第三方 OCR API（百度/阿里）。

**Q: LLM 分析失败？**

A: 检查智谱 API Key 是否正确，以及是否有足够的 API 额度。

**Q: 任务一直处于 processing 状态？**

A: 检查浏览器日志，可能是页面加载超时或截图失败。

## 后续优化方向

- [ ] 支持更多平台（抖音、B站等）
- [ ] 支持上传截图分析
- [ ] 引入 Redis 缓存和任务队列
- [ ] 升级到 PaddleOCR 提升准确率
- [ ] 添加用户系统和历史记录
- [ ] API 开放平台

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
