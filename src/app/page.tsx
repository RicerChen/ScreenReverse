"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfigPanel from "@/components/ConfigPanel";
import { ConfigStorage } from "@/lib/config/storage";
import { LLMProvider } from "@/lib/types/config";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<{
    provider: LLMProvider;
    apiKey: string;
    model?: string;
  } | null>(null);

  // 加载配置
  useEffect(() => {
    const savedConfig = ConfigStorage.getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleConfigChange = (newConfig: {
    provider: LLMProvider;
    apiKey: string;
    model?: string;
  }) => {
    setConfig(newConfig);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证 URL
    if (!url.trim()) {
      setError("请输入链接");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("请输入有效的链接（如 https://...）");
      return;
    }

    // 检查配置
    if (!config || !config.apiKey) {
      setError("请先配置 API Key（点击右上角配置按钮）");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 创建任务
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "创建任务失败");
      }

      const { taskId } = await response.json();

      // 跳转到任务结果页
      router.push(`/task/${taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建任务失败");
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 配置面板 */}
      <ConfigPanel onConfigChange={handleConfigChange} />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ScreenReverse
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              内容逆向分析工具 - 输入链接，自动拆解内容结构，生成可复用的
              Prompt 套餐
            </p>
          </div>

          {/* 输入表单 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  内容链接
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  支持小红书、公众号、博客等平台链接
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "创建中..." : "开始逆向"}
              </button>
            </form>
          </div>

          {/* 说明 */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              我们会自动截图、提取文本、用 AI 分析内容结构，然后生成可复用的
              Prompt 模板
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
